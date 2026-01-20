import { 
  ILogParser, 
  FormatDetectionResult, 
  ParserOptions, 
  ParsingProgress 
} from '../../../../shared/types/parser.types';
import { 
  ParsedLog, 
  LogEntry, 
  LogFileMetadata 
} from '../../../../shared/types/log.types';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

/**
 * Classe abstrata base para todos os parsers
 * Implementa lógica comum e força subclasses a implementarem métodos específicos
 */
export abstract class BaseLogParser implements ILogParser {
  canParser(filename: string, sampleContent: string): FormatDetectionResult {
      throw new Error('Method not implemented.');
  }
  parseStram(filePath: string, options?: ParserOptions): AsyncIterableIterator<LogEntry> {
      throw new Error('Method not implemented.');
  }
  
  // Métodos abstratos que cada parser específico deve implementar
  abstract getName(): string;
  abstract getSupportedFormats(): string[];
  abstract canParse(filename: string, sampleContent: string): FormatDetectionResult;
  abstract parseLine(line: string, lineNumber: number, options?: ParserOptions): LogEntry | null;

  /**
   * Parse completo do arquivo
   * Implementação padrão que usa parseStream internamente
   */
  async parse(
    filePath: string,
    options: ParserOptions = {},
    onProgress?: (progress: ParsingProgress) => void
  ): Promise<ParsedLog> {
    const startTime = Date.now();
    const entries: LogEntry[] = [];
    
    // Obter metadados do arquivo
    const stats = await fs.promises.stat(filePath);
    const totalBytes = stats.size;
    let processedBytes = 0;
    let processedLines = 0;
    let failedLines = 0;

    // Aplicar limite de linhas se especificado
    const maxLines = options.maxLines || Infinity;

    // Iterar pelo stream
    for await (const entry of this.parseStream(filePath, options)) {
      entries.push(entry);
      processedLines++;
      
      // Emitir progresso
      if (onProgress && processedLines % 100 === 0) {
        const elapsedMs = Date.now() - startTime;
        const percentage = Math.min((processedLines / maxLines) * 100, 100);
        
        onProgress({
          processedLines,
          totalLines: maxLines === Infinity ? undefined : maxLines,
          percentage,
          processesBytes: processedBytes,
          totalBytes,
          elapsedMs,
          estimatedReaminingMs: percentage > 0 
            ? (elapsedMs / percentage) * (100 - percentage)
            : undefined
        });
      }

      // Verificar se atingiu o limite
      if (processedLines >= maxLines) {
        break;
      }
    }

    // Contar linhas com problemas
    failedLines = entries.filter(e => e.parsingIssues && e.parsingIssues.length > 0).length;

    // Construir metadados
    const metadata: LogFileMetadata = {
      fileName: path.basename(filePath),
      filePath,
      fileSizeBytes: totalBytes,
      totalLines: processedLines,
      parsedLines: processedLines - failedLines,
      failedLines,
      uniqueSessions: this.countUniqueSessions(entries),
      detectedFormat: this.getName(),
      encoding: options.encoding || 'utf8'
    };

    // Adicionar range de datas se disponível
    if (entries.length > 0) {
      const dates = entries
        .map(e => e.context.fullDate)
        .filter((d): d is Date => d !== undefined);
      
      if (dates.length > 0) {
        metadata.dateRange = {
          start: new Date(Math.min(...dates.map(d => d.getTime()))),
          end: new Date(Math.max(...dates.map(d => d.getTime())))
        };
      }
    }

    return {
      metadata,
      entries,
      parsedAt: new Date(),
      parsingDurationMs: Date.now() - startTime
    };
  }

  /**
   * Parse em streaming - implementação padrão linha por linha
   */
  async* parseStream(
    filePath: string,
    options: ParserOptions = {}
  ): AsyncIterableIterator<LogEntry> {
    const fileStream = fs.createReadStream(filePath, {
      encoding: options.encoding || 'utf8'
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    const maxLines = options.maxLines || Infinity;

    try {
      for await (const line of rl) {
        lineNumber++;
        
        // Verificar limite
        if (lineNumber > maxLines) {
          break;
        }

        // Pular linhas vazias
        if (!line.trim()) {
          continue;
        }

        // Parsear linha
        const entry = this.parseLine(line, lineNumber, options);
        
        if (entry) {
          // Aplicar filtros se houver
          if (this.shouldIncludeEntry(entry, options.filters)) {
            yield entry;
          }
        }
      }
    } finally {
      fileStream.close();
    }
  }

  /**
   * Verifica se uma entrada deve ser incluída baseado nos filtros
   */
  protected shouldIncludeEntry(entry: LogEntry, filters?: any[]): boolean {
    if (!filters || filters.length === 0) {
      return true;
    }

    for (const filter of filters) {
      const value = this.getFilterFieldValue(entry, filter.field);
      const matches = this.matchesPattern(value, filter.pattern);

      if (filter.type === 'include' && !matches) {
        return false;
      }
      if (filter.type === 'exclude' && matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtém o valor de um campo para filtragem
   */
  protected getFilterFieldValue(entry: LogEntry, field: string): string {
    switch (field) {
      case 'message':
        return entry.message;
      case 'processId':
        return entry.context.processId;
      case 'severity':
        return entry.severity;
      case 'messageType':
        return entry.messageType;
      default:
        return '';
    }
  }

  /**
   * Verifica se um valor corresponde a um padrão
   */
  protected matchesPattern(value: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value);
    }
    return value.includes(pattern);
  }

  /**
   * Conta sessões únicas (PIDs)
   */
  protected countUniqueSessions(entries: LogEntry[]): number {
    const uniquePids = new Set(entries.map(e => e.context.processId));
    return uniquePids.size;
  }

  /**
   * Utilitário: Remove tags HTML de uma string
   */
  protected stripHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  /**
   * Utilitário: Extrai tabelas de uma query SQL
   */
  protected extractTablesFromSQL(sql: string): string[] {
    const tables = new Set<string>();
    
    // Regex simples para capturar nomes de tabelas após FROM e JOIN
    const fromPattern = /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    const joinPattern = /\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    
    let match;
    while ((match = fromPattern.exec(sql)) !== null) {
      tables.add(match[1].toLowerCase());
    }
    while ((match = joinPattern.exec(sql)) !== null) {
      tables.add(match[1].toLowerCase());
    }
    
    return Array.from(tables);
  }

  /**
   * Utilitário: Detecta tipo de query SQL
   */
  protected detectQueryType(sql: string): 'select' | 'insert' | 'update' | 'delete' | 'other' {
    const normalizedSQL = sql.trim().toUpperCase();
    
    if (normalizedSQL.startsWith('SELECT')) return 'select';
    if (normalizedSQL.startsWith('INSERT')) return 'insert';
    if (normalizedSQL.startsWith('UPDATE')) return 'update';
    if (normalizedSQL.startsWith('DELETE')) return 'delete';
    
    return 'other';
  }

  /**
   * Utilitário: Parseia memória de strings como "12.79 mb" para número
   */
  protected parseMemoryString(memoryStr: string): number {
    const match = memoryStr.match(/([\d.]+)\s*(mb|kb|gb)?/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'mb').toLowerCase();

    switch (unit) {
      case 'kb': return value / 1024;
      case 'mb': return value;
      case 'gb': return value * 1024;
      default: return value;
    }
  }

  /**
   * Utilitário: Determina severidade baseado no conteúdo
   */
  protected determineSeverity(
    message: string, 
    messageType: string,
    executionTime?: number
  ): 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' {
    const lowerMessage = message.toLowerCase();

    // Erros críticos
    if (lowerMessage.includes('fatal') || 
        lowerMessage.includes('critical') ||
        lowerMessage.includes('exception')) {
      return 'CRITICAL';
    }

    // Erros
    if (lowerMessage.includes('error') || 
        lowerMessage.includes('erro') ||
        lowerMessage.includes('failed')) {
      return 'ERROR';
    }

    // Warnings (incluindo queries lentas)
    if (lowerMessage.includes('warning') || 
        lowerMessage.includes('aviso') ||
        (executionTime && executionTime > 0.1)) {
      return 'WARNING';
    }

    // Debug
    if (messageType === 'DEBUG' || 
        lowerMessage.includes('debug') ||
        lowerMessage.includes('bind')) {
      return 'DEBUG';
    }

    return 'INFO';
  }

  /**
   * Utilitário: Gera tags automáticas baseado no conteúdo
   */
  protected generateTags(entry: Partial<LogEntry>): string[] {
    const tags: string[] = [];

    // Tag de tipo
    if (entry.messageType) {
      tags.push(entry.messageType.toLowerCase());
    }

    // Tags de SQL
    if (entry.sqlInfo) {
      const sql = entry.sqlInfo;
      
      // Query lenta
      if (sql.executionTime && sql.executionTime > 0.1) {
        tags.push('slow-query');
        if (sql.executionTime > 1) {
          tags.push('very-slow-query');
        }
      }

      // SELECT *
      if (sql.query.toUpperCase().includes('SELECT *')) {
        tags.push('select-all');
      }

      // Sem WHERE
      if (sql.queryType === 'select' && !sql.query.toUpperCase().includes('WHERE')) {
        tags.push('no-where-clause');
      }

      // Muitos registros
      if (sql.recordsReturned && sql.recordsReturned > 100) {
        tags.push('large-result-set');
      }
    }

    // Tag de transação
    if (entry.message?.toUpperCase().includes('BEGIN') || 
        entry.message?.toUpperCase().includes('COMMIT') ||
        entry.message?.toUpperCase().includes('ROLLBACK')) {
      tags.push('transaction');
    }

    return tags;
  }
}
