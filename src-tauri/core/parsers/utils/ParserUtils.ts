/**
 * Utilitários comuns para parsing de logs
 */

/**
 * Remove tags HTML de uma string
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Remove espaços em branco extras e normaliza quebras de linha
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extrai timestamp no formato HH:MM:SS
 */
export function extractTimestamp(text: string): string | null {
  const match = text.match(/\b(\d{2}):(\d{2}):(\d{2})\b/);
  return match ? match[0] : null;
}

/**
 * Parseia string de memória (ex: "12.79 mb") para número em MB
 */
export function parseMemoryString(memoryStr: string): number {
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
 * Extrai tempo de execução de strings como "Tempo Execução: 0.001 segundo(s)"
 */
export function extractExecutionTime(text: string): number | null {
  const match = text.match(/Tempo Execução:\s*([\d.]+)\s*segundo/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extrai número de registros retornados
 */
export function extractRecordsReturned(text: string): number | null {
  const match = text.match(/Registros Retornados:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detecta tipo de query SQL
 */
export function detectQueryType(sql: string): 'select' | 'insert' | 'update' | 'delete' | 'other' {
  const normalized = sql.trim().toUpperCase();
  
  if (normalized.startsWith('SELECT')) return 'select';
  if (normalized.startsWith('INSERT')) return 'insert';
  if (normalized.startsWith('UPDATE')) return 'update';
  if (normalized.startsWith('DELETE')) return 'delete';
  
  return 'other';
}

/**
 * Extrai tabelas de uma query SQL
 */
export function extractTablesFromSQL(sql: string): string[] {
  const tables = new Set<string>();
  
  // Regex para capturar nomes após FROM e JOIN
  const patterns = [
    /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /\bINTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      tables.add(match[1].toLowerCase());
    }
  }
  
  return Array.from(tables);
}

/**
 * Parseia array PHP de binds (ex: "array (\n  ':bd_c_0' => '5184852930',\n)")
 */
export function parsePhpBindsArray(text: string): Record<string, any> | null {
  const binds: Record<string, any> = {};
  
  // Regex para capturar pares chave-valor
  const bindPattern = /'([^']+)'\s*=>\s*'([^']*)'/g;
  const bindPatternNum = /'([^']+)'\s*=>\s*(\d+)/g;
  
  let match;
  
  // Capturar strings
  while ((match = bindPattern.exec(text)) !== null) {
    binds[match[1]] = match[2];
  }
  
  // Capturar números
  while ((match = bindPatternNum.exec(text)) !== null) {
    binds[match[1]] = parseInt(match[2], 10);
  }
  
  return Object.keys(binds).length > 0 ? binds : null;
}

/**
 * Substitui binds em uma query SQL
 */
export function substituteBinds(sql: string, binds: Record<string, any>): string {
  let result = sql;
  
  for (const [key, value] of Object.entries(binds)) {
    const valueStr = typeof value === 'string' ? `'${value}'` : String(value);
    result = result.replace(new RegExp(key, 'g'), valueStr);
  }
  
  return result;
}

/**
 * Verifica se uma linha é multi-linha SQL (não terminou)
 */
export function isIncompleteSQL(line: string): boolean {
  const trimmed = line.trim();
  
  // Verifica se termina com vírgula, AND, OR, operadores, etc
  if (trimmed.endsWith(',') || 
      trimmed.endsWith('AND') ||
      trimmed.endsWith('OR') ||
      trimmed.endsWith('(')) {
    return true;
  }
  
  // Verifica se começou SELECT mas não tem FROM
  if (trimmed.toUpperCase().includes('SELECT') && 
      !trimmed.toUpperCase().includes('FROM')) {
    return true;
  }
  
  return false;
}

/**
 * Limpa query SQL removendo espaços extras e formatação
 */
export function cleanSQL(sql: string): string {
  return sql
    .replace(/<br>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula hash simples de string (para IDs)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Formata bytes em formato legível
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formata duração em ms para formato legível
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Valida se uma string é um timestamp válido HH:MM:SS
 */
export function isValidTimestamp(timestamp: string): boolean {
  const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return false;
  
  const [, hours, minutes, seconds] = match;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);
  
  return h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60;
}
