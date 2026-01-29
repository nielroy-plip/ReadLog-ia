# ReadLog-IA

## 📖 Sobre o Projeto

**ReadLog-IA** é uma ferramenta inteligente para análise de logs de banco de dados que utiliza técnicas de análise automatizada para identificar problemas de performance, erros e padrões em arquivos de log.

## 🤖 Funcionalidades com IA

O projeto analisa automaticamente logs de banco de dados e fornece insights inteligentes sobre:

### Análise de Performance
- **Detecção de Queries Lentas**: Identifica consultas SQL com tempo de execução acima do threshold configurado
- **Análise de Padrões**: Agrupa queries similares e identifica gargalos de performance
- **Estatísticas Detalhadas**: Calcula métricas como tempo médio, mínimo, máximo e percentil 95

### Detecção de Problemas
- **Identificação de Erros**: Agrupa e categoriza erros automaticamente por padrão
- **Análise de Memória**: Detecta picos de uso de memória e processos problemáticos
- **Queries Problemáticas**: Identifica SELECT sem WHERE, SELECT *, e large result sets

### Análise Inteligente
- **Uso de Tabelas**: Rastreia quais tabelas são mais acessadas e tipos de operações
- **Timeline de Eventos**: Cria uma linha do tempo visual de queries, transações e erros
- **Resumo de Sessões**: Agrupa análises por processo/sessão para identificar problemas isolados
- **Sugestões Automáticas**: Fornece recomendações para otimização baseadas nos padrões detectados

## 🔍 Como Funciona

1. **Parser Inteligente**: Lê e interpreta arquivos de log (.zlg e outros formatos)
2. **Classificação Automática**: Categoriza cada entrada de log (SQL, erro, performance, etc.)
3. **Análise de Contexto**: Extrai informações como tempo de execução, tabelas envolvidas, binds de parâmetros
4. **Geração de Insights**: Produz análises e recomendações baseadas nos dados coletados

## 📊 Tipos de Análise Disponíveis

- `slow-queries` - Queries com performance ruim
- `error-patterns` - Padrões de erros recorrentes
- `memory-peaks` - Picos de uso de memória
- `session-summary` - Resumo por sessão/processo
- `query-frequency` - Frequência e estatísticas de queries
- `timeline` - Linha do tempo de eventos
- `table-usage` - Análise de uso de tabelas

## 🏗️ Arquitetura

O projeto está estruturado em:
- **Parsers**: Interpretam diferentes formatos de log (atualmente suporta formato .zlg)
- **Types**: Definições de tipos TypeScript para análise de logs e resultados
- **Analysis Types**: Estruturas para diferentes tipos de análise (performance, erros, memória, etc.)

## 🎯 Objetivo

Facilitar a identificação e resolução de problemas em bancos de dados através de análise automatizada e inteligente de logs, economizando tempo de debug e melhorando a performance das aplicações.
