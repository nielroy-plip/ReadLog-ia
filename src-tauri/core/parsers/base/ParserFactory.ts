import { ILogParser, ParserRegistration, FormatDetectionResult } from '../../../../shared/types/parser.types';
import * as fs from 'fs';

/**
 * Factory para gerenciar e selecionar parsers automaticamente
 * Implementa o padrão Factory + Strategy
 */
export class ParserFactory {
  private parsers: ParserRegistration[] = [];

  /**
   * Registra um novo parser com prioridade
   * @param parser Parser a ser registrado
   * @param priority Prioridade (maior = verificado primeiro)
   */
  register(parser: ILogParser, priority: number = 0): void {
    const registration: ParserRegistration = {
      parser,
      priority,
      formats: parser.getSupportedFormats()
    };

    this.parsers.push(registration);
    
    // Ordenar por prioridade (maior primeiro)
    this.parsers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove um parser registrado
   * @param parserName Nome do parser a remover
   */
  unregister(parserName: string): boolean {
    const initialLength = this.parsers.length;
    this.parsers = this.parsers.filter(reg => reg.parser.getName() !== parserName);
    return this.parsers.length < initialLength;
  }

  /**
   * Lista todos os parsers registrados
   */
  listParsers(): string[] {
    return this.parsers.map(reg => reg.parser.getName());
  }

  /**
   * Obtém um parser pelo nome
   * @param name Nome do parser
   */
  getParserByName(name: string): ILogParser | null {
    const registration = this.parsers.find(reg => reg.parser.getName() === name);
    return registration ? registration.parser : null;
  }

  /**
   * Seleciona automaticamente o melhor parser para um arquivo
   * @param filePath Caminho do arquivo
   * @returns Parser selecionado ou null se nenhum for compatível
   */
  async getParser(filePath: string): Promise<ILogParser | null> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Ler amostra do arquivo (primeiras 50 linhas)
    const sampleContent = await this.readFileSample(filePath, 50);
    const filename = filePath.split(/[/\\]/).pop() || '';

    // Testar cada parser em ordem de prioridade
    let bestMatch: { parser: ILogParser; confidence: number } | null = null;

    for (const registration of this.parsers) {
      const result = registration.parser.canParser(filename, sampleContent);
      
      if (result.canParser) {
        // Se confiança é 100%, retornar imediatamente
        if (result.confidence >= 1.0) {
          return registration.parser;
        }

        // Guardar o melhor match até agora
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = {
            parser: registration.parser,
            confidence: result.confidence
          };
        }
      }
    }

    // Retornar o melhor match (se houver)
    return bestMatch ? bestMatch.parser : null;
  }

  /**
   * Detecta o formato de um arquivo sem retornar o parser
   * @param filePath Caminho do arquivo
   * @returns Informações de detecção
   */
  async detectFormat(filePath: string): Promise<FormatDetectionResult & { parserName?: string }> {
    const parser = await this.getParser(filePath);
    
    if (!parser) {
      return {
        canParser: false,
        confidence: 0,
        reason: 'No compatible parser found'
      };
    }

    const sampleContent = await this.readFileSample(filePath, 50);
    const filename = filePath.split(/[/\\]/).pop() || '';
    const result = parser.canParser(filename, sampleContent);

    return {
      ...result,
      parserName: parser.getName()
    };
  }

  /**
   * Filtra parsers por extensão de arquivo
   * @param extension Extensão do arquivo (ex: '.zlg')
   */
  getParsersByExtension(extension: string): ILogParser[] {
    const normalizedExt = extension.toLowerCase().replace(/^\./, '');
    
    return this.parsers
      .filter(reg => reg.formats.some(fmt => 
        fmt.toLowerCase().replace(/^\./, '') === normalizedExt
      ))
      .map(reg => reg.parser);
  }

  /**
   * Lê uma amostra do início do arquivo
   * @param filePath Caminho do arquivo
   * @param maxLines Número máximo de linhas a ler
   */
  private async readFileSample(filePath: string, maxLines: number = 50): Promise<string> {
    return new Promise((resolve, reject) => {
      const lines: string[] = [];
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      
      let buffer = '';
      let lineCount = 0;

      stream.on('data', (chunk: string) => {
        buffer += chunk;
        const newLines = buffer.split('\n');
        
        // Manter a última linha incompleta no buffer
        buffer = newLines.pop() || '';
        
        for (const line of newLines) {
          lines.push(line);
          lineCount++;
          
          if (lineCount >= maxLines) {
            stream.close();
            resolve(lines.join('\n'));
            return;
          }
        }
      });

      stream.on('end', () => {
        if (buffer) {
          lines.push(buffer);
        }
        resolve(lines.join('\n'));
      });

      stream.on('error', reject);
    });
  }

  /**
   * Valida se um arquivo pode ser parseado por pelo menos um parser
   * @param filePath Caminho do arquivo
   */
  async canParseFile(filePath: string): Promise<boolean> {
    try {
      const parser = await this.getParser(filePath);
      return parser !== null;
    } catch {
      return false;
    }
  }

  /**
   * Obtém estatísticas sobre parsers registrados
   */
  getStatistics(): {
    totalParsers: number;
    parsersByFormat: Record<string, string[]>;
  } {
    const parsersByFormat: Record<string, string[]> = {};

    for (const registration of this.parsers) {
      for (const format of registration.formats) {
        if (!parsersByFormat[format]) {
          parsersByFormat[format] = [];
        }
        parsersByFormat[format].push(registration.parser.getName());
      }
    }

    return {
      totalParsers: this.parsers.length,
      parsersByFormat
    };
  }

  /**
   * Limpa todos os parsers registrados
   */
  clear(): void {
    this.parsers = [];
  }
}

/**
 * Instância singleton global do factory
 * Pode ser importada e usada em toda a aplicação
 */
export const parserFactory = new ParserFactory();
