/**
 * Tipos de mensagem identificados em logs
 */
export type LogMessageType = 
    | 'SQL'           // Queries SQL
    | 'SQL_BIND'      // Binds de parâmetros
    | 'PERFORMANCE'   // Métricas de tempo de execução
    | 'TRANSACTION'   // BEGIN/COMMIT/ROLLBACK
    | 'DEBUG'         // Mensagens de debug
    | 'INFO'          // Informações gerais
    | 'ERROR'         // Erros e exceções
    | 'UNKNOWN';      // Não identificado

/**
 * Nível de severidade do log
 */
export type LogSeverity = 
  | 'DEBUG'    // Informações técnicas detalhadas
  | 'INFO'     // Informações gerais
  | 'WARNING'  // Avisos (ex: queries lentas)
  | 'ERROR'    // Erros que precisam atenção
  | 'CRITICAL'; // Erros críticos que param a aplicação

/**
 * Tipo de query SQL
 */
export type SQLQueryType = 'select' | 'insert' | 'update' | 'delete' | 'other';

/**
 * Informações extraídas de queries SQL
 */
export interface SQLInfo {
  /** Query SQL original */
  query: string;
  
  /** Parâmetros bindados (ex: {':bd_c_0': '5184852930'}) */
  binds?: Record<string, any>;
  
  /** Query com binds substituídos (SQL BIND DECODE) */
  decodedQuery?: string;
  
  /** Tempo de execução em segundos */
  executionTime?: number;
  
  /** Número de registros retornados */
  recordsReturned?: number;
  
  /** Tipo de query detectado */
  queryType?: SQLQueryType;
  
  /** Tabelas envolvidas na query */
  tables?: string[];
  
  /** Flag se é uma query multi-linha */
  isMultiLine?: boolean;
}

/**
 * Metadados de contexto de execução
 */
export interface ExecutionContext {
  /** Timestamp (HH:MM:SS) */
  timestamp: string;
  
  /** Data completa (será inferida ou configurada) */
  fullDate?: Date;
  
  /** Info do servidor (ex: "2.14.180.156.c-bistek-v18.3(RADEZ-58)-25253") */
  serverInfo: string;
  
  /** Process ID único da sessão */
  processId: string;
  
  /** Uso de memória como string (ex: "12.79 mb") */
  memoryUsage: string;
  
  /** Uso de memória em MB (parseado) */
  memoryMB: number;
  
  /** Índice de conexão / contexto (ex: "funcoesGerais::retornarValorParametro") */
  connectionIndex: string;
}

/**
 * Entrada única de log parseada
 * Este é o tipo principal que todo parser deve produzir
 */
export interface LogEntry {
  /** Número da linha no arquivo original */
  lineNumber: number;
  
  /** Linha original completa (raw) */
  rawLine: string;
  
  /** Contexto de execução */
  context: ExecutionContext;
  
  /** Mensagem principal (após os metadados) */
  message: string;
  
  /** Tipo de mensagem identificado */
  messageType: LogMessageType;
  
  /** Nível de severidade */
  severity: LogSeverity;
  
  /** Informações SQL (se aplicável) */
  sqlInfo?: SQLInfo;
  
  /** Tags automáticas aplicadas (ex: ['slow-query', 'select-all']) */
  tags: string[];
  
  /** Flag se o parsing teve problemas */
  parsingIssues?: string[];
}

/**
 * Metadados do arquivo de log parseado
 */
export interface LogFileMetadata {
  /** Nome do arquivo */
  fileName: string;
  
  /** Caminho completo */
  filePath: string;
  
  /** Tamanho do arquivo em bytes */
  fileSizeBytes: number;
  
  /** Total de linhas no arquivo */
  totalLines: number;
  
  /** Linhas parseadas com sucesso */
  parsedLines: number;
  
  /** Linhas que falharam no parsing */
  failedLines: number;
  
  /** Range de datas (se disponível) */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Número de sessões únicas (PIDs únicos) */
  uniqueSessions: number;
  
  /** Formato detectado (ex: 'zlg', 'zl1', 'generic') */
  detectedFormat: string;
  
  /** Encoding do arquivo */
  encoding: string;
}

/**
 * Resultado completo do parsing de um log
 */
export interface ParsedLog {
  /** Metadados do arquivo */
  metadata: LogFileMetadata;
  
  /** Entradas de log parseadas */
  entries: LogEntry[];
  
  /** Timestamp do parsing */
  parsedAt: Date;
  
  /** Tempo total de parsing em ms */
  parsingDurationMs: number;
}

/**
 * Resumo de uma sessão (agrupado por PID)
 */
export interface SessionSummary {
  /** Process ID da sessão */
  processId: string;
  
  /** Total de queries executadas */
  totalQueries: number;
  
  /** Queries lentas (acima do threshold) */
  slowQueries: number;
  
  /** Tempo médio de execução (em segundos) */
  avgExecutionTime: number;
  
  /** Tempo total acumulado */
  totalExecutionTime: number;
  
  /** Pico de memória usado */
  peakMemoryMB: number;
  
  /** Range de tempo da sessão */
  timeRange: {
    start: string;
    end: string;
  };
  
  /** Entradas de log desta sessão */
  entries: LogEntry[];
}