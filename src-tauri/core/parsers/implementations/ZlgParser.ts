import { BaseLogParser } from '../base/BaseLogParser';
import { 
  FormatDetectionResult, 
  ParserOptions 
} from '../../../../shared/types/parser.types';
import { 
  LogEntry, 
  LogMessageType, 
  LogSeverity,
  ExecutionContext,
  SQLInfo
} from '../../../../shared/types/log.types';
import {
  stripHtmlTags,
  parseMemoryString,
  extractExecutionTime,
  extractRecordsReturned,
  detectQueryType,
  extractTablesFromSQL,
  parsePhpBindsArray,
  cleanSQL
} from '../utils/ParserUtils';

export class ZlgParser extends BaseLogParser {
    canParse(filename: string, sampleContent: string): FormatDetectionResult {
        throw new Error('Method not implemented.');
    }
    private readonly LOG_LINE_PATTERN = /^\[(\d{2}:\d{2}:\d{2})\s+<([^>]+)>\s+\(Pid:\s+([^)]+)\)\s+\(([^)]+)\)\s*\]\s+\[ConnIdx:\s*([^\]]*)\]\s+(.+)$/;

    private readonly SQL_PATTERNS = {
    SQL_RAW: /SQL Antes processamento:/i,
    SQL_PROCESSED: /SQL Após processamento:/i,
    SQL_EXECUTED: /\bSQL:/i,
    SQL_BIND: /No Pré executa BINDS:/i,
    SQL_DECODE: /SQL BIND DECODE:/i,
    EXECUTION_TIME: /Tempo Execução:/i,
    RECORDS_RETURNED: /Registros Retornados:/i,
    QUERY_TYPE: /Tipo de query:/i,
    TRANSACTION: /\b(BEGIN TRANSACTION|COMMIT|ROLLBACK)\b/i
  };

  private multiLineBuffer: string[] = [];
  private isInMultiLineSQL = false;
  private multiLineStartNumber = 0;

  getName(): string {
    return 'ZlgParser';
  }

  getSupportedFormats(): string[] {
    return ['.zlg', '.ZLG'];
  }

  canParser(filename: string, sampleContent: string): FormatDetectionResult {
    const hasZlgExtension = /\.zlg$/i.test(filename);

    const lines = sampleContent.split('\n').slice(0, 10);
    let matchingLines = 0;

    for (const line of lines) {
        if (this.LOG_LINE_PATTERN.test(line)) {
            matchingLines++;
        }
    }

    const matchRatio = matchingLines / Math.min(lines.length, 10);

    if (hasZlgExtension && matchRatio > 0.7) {
        return {
            canParser: true,
            confidence: 0.95,
            format: 'zlg',
            reason: 'Extension .zlg and content matches ZLG format pattern'
        };
    }

    if (matchRatio > 0.8) {
        return {
            canParser: true,
            confidence: 0.85,
            format: 'zlg',
            reason: 'Content strongly matches ZLG format pattern format pattern'
        };
    }

    if (hasZlgExtension) {
      return {
        canParser: true,
        confidence: 0.6,
        format: 'zlg',
        reason: 'Has .zlg extension but content partially matches'
      };
    }

    return {
      canParser: false,
      confidence: 0,
      reason: 'Does not match ZLG format'
    };
  }

  parseLine(line: string, lineNumber: number, options: ParserOptions = {}): LogEntry | null {
    if (!line.trim()) {
        return null;
    }

    const match = this.LOG_LINE_PATTERN.exec(line);

    if (!match) {
        return this.handleNonStandardLine(line, lineNumber, options);
    }

    const [, timestamp, serverInfo, processId, memoryUsage, connectionIndex, message] = match;

    const context: ExecutionContext = {
        timestamp,
        serverInfo,
        processId,
        memoryUsage,
        memoryMB: parseMemoryString(memoryUsage),
        connectionIndex: connectionIndex.trim(),
        fullDate: this.inferFullDate(timestamp, options.baseDate)
    };

    const cleanMessage = stripHtmlTags(message).trim();

    const messageType = this.identifyMessageType(cleanMessage);

    const sqlInfo = this.extractSQLInfo(cleanMessage, messageType);

    const severity = this.determineSeverity(
        cleanMessage,
        messageType,
        sqlInfo?.executionTime
    );

    const entry: LogEntry = {
        lineNumber,
        rawLine: line,
        context,
        message: cleanMessage,
        messageType,
        severity,
        sqlInfo,
        tags: [],
        parsingIssues: []
    };

    entry.tags = this.generateTags(entry);

    return entry;
  }

  private handleNonStandardLine(
    line: string,
    lineNumber: number,
    options: ParserOptions
  ): LogEntry | null {
    if (line.includes('SQL BIN DECODE:')) {
        return this.createInfoEntry(line, lineNumber, 'SQL_BIND');
    }

    return this.createInfoEntry(line, lineNumber, 'UNKNOWN');
  }

    private createInfoEntry(
        line: string,
        lineNumber: number,
        messageType: LogMessageType
    ): LogEntry {
        const cleanMessage = stripHtmlTags(line).trim();

        return {
            lineNumber,
            rawLine: line,
            context: {
                timestamp: '00:00:00',
                serverInfo: '',
                processId: '',
                memoryUsage: '0 mb',
                memoryMB: 0,
                connectionIndex: ''
            },
            message: cleanMessage,
            messageType,
            severity: 'INFO',
            tags: [messageType.toLowerCase()],
            parsingIssues: ['Non-standard line format']
        };
    }

    private identifyMessageType(message: string): LogMessageType {
        if (this.SQL_PATTERNS.SQL_RAW.test(message) ||
            this.SQL_PATTERNS.SQL_PROCESSED.test(message) ||
        this.SQL_PATTERNS.SQL_EXECUTED.test(message)) {
      return 'SQL';
    }
    if (this.SQL_PATTERNS.SQL_BIND.test(message) ||
        this.SQL_PATTERNS.SQL_DECODE.test(message)) {
      return 'SQL_BIND';
    }

    if (this.SQL_PATTERNS.EXECUTION_TIME.test(message)) {
      return 'PERFORMANCE';
    }

    if (this.SQL_PATTERNS.TRANSACTION.test(message)) {
      return 'TRANSACTION';
    }

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('error') || 
        lowerMessage.includes('erro') ||
        lowerMessage.includes('exception') ||
        lowerMessage.includes('fatal')) {
      return 'ERROR';
    }

    if (message.includes('->') && (message.includes('STR->') || message.includes('INT->'))) {
        return 'DEBUG';
    }

    return 'INFO';
}

    private extractSQLInfo(message: string, messageType: LogMessageType): SQLInfo | undefined {
        if (messageType !== 'SQL' && messageType !== 'SQL_BIND' && messageType !== 'PERFORMANCE') {
            return undefined;
        }

        const sqlInfo: Partial<SQLInfo> = {};

        if (messageType === 'SQL') {
            const sqlMatch = message.match(/SQL:\s*(.+?)(?:<br>|$)/s);
            if (sqlMatch) {
                sqlInfo.query = cleanSQL(sqlMatch[1]);
        sqlInfo.queryType = detectQueryType(sqlInfo.query);
        sqlInfo.tables = extractTablesFromSQL(sqlInfo.query);
            }
        }

        if (this.SQL_PATTERNS.SQL_BIND.test(message)) {
            const bind = parsePhpBindsArray(message);
            if (bind) {
                sqlInfo.binds = parsePhpBindsArray;
            }
        }

        if (this.SQL_PATTERNS.SQL_DECODE.test(message)) {
      const decodeMatch = message.match(/SQL BIND DECODE:\s*(.+?)(?:<br>|$)/s);
      if (decodeMatch) {
        sqlInfo.decodedQuery = cleanSQL(decodeMatch[1]);
      }
    }

     const executionTime = extractExecutionTime(message);
    if (executionTime !== null) {
      sqlInfo.executionTime = executionTime;
    }

    const recordsReturned = extractRecordsReturned(message);
    if (recordsReturned !== null) {
      sqlInfo.recordsReturned = recordsReturned;
    }

    return Object.keys(sqlInfo).length > 0 ? sqlInfo as SQLInfo : undefined;
  }

  private inferFullDate(timestamp: string, baseDate?: Date): Date | undefined {
    if (!baseDate) {
      return undefined;
    }

    const [hours, minutes, seconds] = timestamp.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, seconds, 0);

    return date;
  }

  protected generateTags(entry: LogEntry): string[] {
    const tags = super.generateTags(entry);

    if (entry.message.includes('Ligamos o acelerador')) {
      tags.push('accelerator-enabled');
    }

    if (entry.sqlInfo?.binds) {
      tags.push('has-binds');
    }

    if (entry.sqlInfo?.decodedQuery) {
      tags.push('decoded-query');
    }

    if (entry.context.connectionIndex && 
        entry.context.connectionIndex.includes('::')) {
      tags.push('scoped-context');
    }

    return tags;
  }
}