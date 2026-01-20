import { ParsedLog, LogEntry } from './log.types';

/**
 * Opções de parsing configuráveis
 */
export interface ParserOptions {
    /** Data base para inferir timestamps completos*/
    baseDate?: Date;

    slowQueryThreshold?: number;

    maxLines?: number;

    encoding?: BufferEncoding;

    chunkSize?: number;

    stopOnError?: boolean;

    filters?: ParserFilter[];
}

export interface ParserFilter {
    type: 'include' | 'exclude';

    field: 'message' | 'processId' | 'severity' | 'messageType';

    pattern: string | RegExp;
}

export interface FormatDetectionResult {
    canParser: boolean;

    confidence: number;

    format?: string;

    reason?: string;
}

export interface ParsingProgress {
    processedLines: number;

    totalLines?: number;

    percentage: number;

    processesBytes: number;

    totalBytes: number;

    elapsedMs: number;

    estimatedReaminingMs?: number;
}

export interface ILogParser {

    canParser(filename: string, sampleContent: string): FormatDetectionResult;

    parse(
        filePath: string,
        options?: ParserOptions,
        onProgress?: (progress: ParsingProgress) => void
    ): Promise<ParsedLog>;

    parseLine(line: string, lineNumber: number, options?: ParserOptions): LogEntry | null;

    parseStram(
        filePath: string,
        options?: ParserOptions,
    ): AsyncIterableIterator<LogEntry>;

    getName(): string;

    getSupportedFormats(): string[];
}

export interface ParserRegistration {
    parser: ILogParser;

    priority: number;

    formats: string[];
}