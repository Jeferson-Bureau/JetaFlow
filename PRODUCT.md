# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipe da JETAPRINT (gráfica digital + offset), 1-3 usuários concorrentes,
rodando na rede local da própria gráfica. Dois papéis:

- **ADMIN** (gestão): cadastros (clientes, fornecedores, substratos,
  equipamentos, acabamentos), configurações da empresa/numeração/parâmetros,
  usuários, e visão completa de custos/margens na precificação.
- **OPERADOR** (produção): opera o dia a dia de chão de fábrica — orçamentos,
  ordens de serviço, geração e conferência de etiquetas/expedição — com
  acesso à precificação (custo/margem) já liberado especificamente para uso
  em cotação, mas sem acesso à gestão de cadastros/configurações.

## Product Purpose

ERP interno feito sob medida para a JETAPRINT, cobrindo o fluxo ponta a
ponta da gráfica: cadastro de clientes/fornecedores/insumos → orçamento com
motor de precificação próprio → conversão em Ordem de Serviço → produção em
8 estágios fixos → geração de etiquetas com QR por volume → conferência de
expedição → acompanhamento de licitações públicas (PNCP). Sucesso é
substituir planilhas soltas e controle manual por um sistema único e
coerente que a equipe realmente usa no dia a dia.

## Positioning

O diferencial é o motor de orçamento sob medida: o cálculo de precificação
combina substrato, equipamento, acabamento, aproveitamento de papel e
margem de forma específica ao negócio da JETAPRINT — algo que um ERP
genérico ou uma planilha não reproduziria com a mesma fidelidade. Esse
motor é a espinha dorsal de todo o fluxo seguinte (OS, etiquetas,
expedição).

## Operating Context

- Ambiente: rede local de uma gráfica digital + offset (não multi-tenant,
  não voltado a múltiplos clientes/empresas).
- Fluxo físico real: cada Ordem de Serviço gera volumes físicos que recebem
  etiquetas impressas (~10×15cm, 4 por folha A4 no formato atual) com QR
  code escaneável na conferência de expedição.
- Integrações externas: BrasilAPI/ViaCEP (autofill de CNPJ/CEP), PNCP
  (consulta pública de licitações, sem autenticação), WhatsApp via link
  `wa.me` (sem Business API).
- Documentos de referência reais (tabelas de preço, fichas técnicas de
  equipamento, planilha de custo de papel, CNPJ/IE, logo) vivem em
  `referencias/` na raiz do projeto (gitignored), usados como dados-fonte
  para popular o módulo de Precificação e Substratos.

## Capabilities and Constraints

- Stack: Next.js (App Router) + TypeScript, SQLite + Prisma ORM, Tailwind
  CSS, NextAuth (modo credentials). SQLite é suficiente pois há apenas 1-3
  usuários concorrentes, rodando localmente — sem necessidade de servidor
  de banco separado.
- Deploy atual: rodando nesta mesma máquina via Task Scheduler, porta 3000.
- Geração de PDF (`@react-pdf/renderer`) precisa rodar em processo separado
  (worker), fora do grafo de rotas do Next — renderizar direto numa
  `route.tsx` quebra com React #31.
- Todos os 6 módulos do roadmap (Fundação + Cadastros, Orçamentos, Ordens
  de Serviço, Etiquetas e Expedição, Licitações, Painel) estão completos e
  em produção desde 2026-09-16/17. Trabalho novo a partir daqui é
  manutenção/evolução de um sistema já em uso real, não construção de
  módulo novo do zero.
- Terminologia do domínio: Orçamento (RASCUNHO→ENVIADO→APROVADO→EXPIRADO),
  Ordem de Serviço/OS (8 estágios fixos: arquivo recebido → pré-impressão →
  produção → acabamento → conferência → embalagem → expedição → concluído),
  Expedição/Volume (etiquetas com `codigoInterno` único), Licitação
  (rastreamento manual via número de controle PNCP).

## Brand Commitments

- Nome do produto/empresa: JETAPRINT (gráfica digital + offset).
- Paleta de marca (modo claro; modo escuro inverte fundo/texto, mantém
  ciano/rosa como destaque):

| Cor | HEX | Uso |
|---|---|---|
| Azul-marinho | #1B3A66 | Texto, logotipo, títulos, rodapé |
| Azul-ciano | #229DCF | Links, botão primário, destaques |
| Amarelo | #FBC64B | Chamadas de atenção |
| Rosa | #E23D7D | Botões secundários, elementos criativos |
| Branco | #FFFFFF | Fundo (modo claro) |

## Evidence on Hand

Documentos reais de negócio (tabelas de preço, fichas técnicas de
equipamento, planilha de custo de papel, tabela de formatos/aproveitamento
de papel, CNPJ/IE, logo) em `referencias/` na raiz — não fazem parte do
app, servem como fonte de dados. Nenhum depoimento, case ou benchmark
externo existe ou deve ser inventado; este é um sistema interno de uso
único (uma gráfica), não um produto comercializado.

## Product Principles

1. O motor de precificação é a fonte de verdade de custo/margem — nenhuma
   tela deve reimplementar ou aproximar esse cálculo.
2. O fluxo é sequencial e conectado (Orçamento → OS → Etiquetas/Expedição);
   evitar criar atalhos ou dados duplicados que quebrem essa cadeia (ex.:
   status derivado em vez de campo redundante, como já decidido para
   "Orçamento convertido").
3. ADMIN e OPERADOR têm visões diferentes por desenho — dados de custo
   sensíveis ficam restritos a ADMIN, exceto onde o próprio fluxo de
   precificação exige acesso do OPERADOR (decisão já em vigor).
4. É um sistema interno de uma única gráfica, não multi-tenant — não
   projetar para múltiplos clientes/organizações.
5. Etiquetas e documentos gerados (PDF) refletem o mundo físico real
   (volumes, QR codes escaneáveis) — mudanças de layout devem ser
   validadas contra o uso real na expedição.
