import { DSAEncoding } from 'node:crypto';
import { LogEntry, SessionSummary, SQLQueryType } from './log.types';

export type AnalysisType =
    | 'slow-queries'
    | 'error-patterns'
    | 'memory-peaks'
    | 'session-summary'
    | 'query-frequency'
    | 'timeline'
    | 'table-usage';

export interface AnalysisConfig {
    types: AnalysisType[];

    slowQueryThreshold?: number;

    limit?: number;

    includeDetails?: boolean;
}

export interface SlowQuery {
    entry: LogEntry;
    executionTime: number;
    severity: 'warning' | 'critical' | 'severe';
    suggestions: string[];
}

export interface ErrorPattern {
    pattern: string;
    errorType: string;
    count: number;
    examples: LogEntry[];
    firstOccurrence: string;
    lastOccurrence: string;
}

export interface MemoryPeak {
    entry: LogEntry;
    memoryMB: number;
    processId: string;
    timestamp: string;
}

export interface QueryStatistics {
    totalQueries: number;
    byType: Record<SQLQueryType, number>;
    avgExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    totalExecutionTime: number;
    slowQueriesCount: number;
    p95ExecutionTime: number;
}

export interface TableUsage {
    tableName: string;
    queryCount: number;
    operations: Record<SQLQueryType, number>;
    totalExecutionTime: number;
}

export interface TimelineEvent {
    timestamp: string;
    type: 'query' | 'transaction' | 'error' | 'warning';
    description: string;
    duration?: number;
    severity: 'info' | 'warning' | 'error';
    entry: LogEntry;
}

export interface AnalysisResult {
    config: AnalysisConfig;
    slowQueries?: SlowQuery[];
    errorPatterns?: ErrorPattern[];
    memoryPeaks?: MemoryPeak[];
    sessionSummaries?: SessionSummary[];
    queryStatistics?: QueryStatistics;
    tableUsage?: TableUsage[];
    timeline?: TimelineEvent[];
    insights: string[];
    analyzedAt: Date;
    analysisDurationMs: number;
}