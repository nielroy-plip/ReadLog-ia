import { ParsedLog, LogEntry } from './log.types';
import { ParserOptions } from './parser.types';
import { AnalysisResult, AnalysisConfig } from './analysis.types';

export type OperationStatus = 'idle' | 'processing' | 'success' | 'error';

export interface IPCResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: number;
    timestamp: number;
}

export interface ParseLogCommand {
    filePath: string;
    options?: ParserOptions;
}

export interface ParseLogResponse extends IPCResponse<ParsedLog> {
    warnings?: string[];
}

export interface AnalyzeLogCommand {
    logId: string;
    config: AnalysisConfig;
}

export interface AnalyzeLogResponse extends IPCResponse<AnalysisResult> {}

export interface DetectFormatCommand {
    filePath: string;
}

export interface DetectFormatResponse extends IPCResponse<{
    format: string;
    confidence: number;
    parserName: string;
}> {}

export interface SearchLogsCommand {
    logId: string;
    query: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    fields?: ('message' | 'query' | 'all')[];
}

export interface SearchLogsResponse extends IPCResponse<{
    results: LogEntry[];
    totalMatches: number;
}> {}

export interface ExportLogCommand {
    logId: string;
    destinationPath: string;
    format: 'json' | 'csv' | 'txt';
    filters?: {
        processIds?: string[];
        severity?: string[];
        timeRange?: { start: string; end: string; };
    };
}

export interface ExportLogResponse extends IPCResponse<{
    exportedLines: number;
    filePath: string;
}> {}

export interface ParsingProgressEvent {
    operationId: string;
    progress: number;
    processdLines: number;
    totalLines: number;
    message: string;
}

export interface IPCCommands {
  'parse_log': {
    request: ParseLogCommand;
    response: ParseLogResponse;
  };
  'analyze_log': {
    request: AnalyzeLogCommand;
    response: AnalyzeLogResponse;
  };
  'detect_format': {
    request: DetectFormatCommand;
    response: DetectFormatResponse;
  };
  'search_logs': {
    request: SearchLogsCommand;
    response: SearchLogsResponse;
  };
  'export_log': {
    request: ExportLogCommand;
    response: ExportLogResponse;
  };
}