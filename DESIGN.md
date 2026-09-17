---
name: JetaFlow
description: ERP interno da JETAPRINT — painel de controle utilitário para orçamento, produção e expedição
colors:
  marinho:
    value: "#1B3A66"
  ciano:
    value: "#229DCF"
  amarelo:
    value: "#FBC64B"
  rosa:
    value: "#E23D7D"
  neutral-bg:
    value: "#FFFFFF"
  neutral-bg-dark:
    value: "#0F1E33"
  neutral-hover-row:
    value: "#F9FAFB"
  neutral-readonly:
    value: "#F3F4F6"
  neutral-muted-text:
    value: "#6B7280"
  neutral-badge:
    value: "#9CA3AF"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: "2.25rem"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  sm: "4px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ciano}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.marinho}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.ciano}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.neutral-bg}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---

# Design System: JetaFlow

## Overview

**Creative North Star: "O Painel de Controle da Gráfica"**

JetaFlow é um ERP interno de uma única gráfica (JETAPRINT), usado por 1-3
pessoas todo dia para orçar, produzir e expedir. Não existe visitante a
convencer — existe operador com uma tarefa e pouco tempo. A linguagem
visual reflete isso deliberadamente: sem sombras, sem tipografia
decorativa, sem imagens de marca — tabelas, formulários e badges de status
lidos rapidamente, com a paleta da JETAPRINT usada como sinalização (cor =
significado: ciano = ação/positivo, rosa = alerta/perigo, amarelo = atenção
intermediária), não como decoração.

A tipografia é a stack sans-serif padrão do sistema operacional (nenhuma
fonte customizada carregada) — reforça o caráter de ferramenta interna,
não de produto vitrine. Cantos levemente arredondados (4px em controles,
8px em cartões/paineis) suavizam sem amaciar; o sistema nunca usa `rounded-full`
ou geometria decorativa.

**Key Characteristics:**
- Flat by design — sem elevação, sem sombra, sem glassmorphism.
- Cor com significado, não decoração — os 3 acentos (ciano/amarelo/rosa)
  carregam estado (positivo/atenção/alerta), o azul-marinho é reservado a
  texto e navegação.
- Densidade alta e neutra — tabelas e formulários compactos (`px-3 py-2`),
  sem espaço vazio decorativo.
- Bordas herdam a cor do texto ambiente (ver Named Rule em Shapes) em vez
  de usar uma paleta de cinza dedicada — resultado direto de nunca
  sobrescrever `borderColor` no Tailwind.

## Colors

A paleta é enxuta e funcional: 4 cores de marca + neutros do sistema
operacional/Tailwind. Nenhuma cor é usada por razão puramente decorativa.

### Primary
- **Ciano Operacional** (`#229DCF`): ação primária — botões de salvar/criar,
  links, hover de itens de navegação, número de destaque nos cards do
  Painel, badge de status "positivo" (ex.: OS no prazo, licitação "vamos
  participar"/"ganhamos").

### Secondary
- **Rosa Ação** (`#E23D7D`): alerta/perigo — mensagens de erro de
  formulário, ação destrutiva ("Sair"), badge de OS atrasada, badge de
  licitação perdida/proposta encerrada.

### Tertiary
- **Amarelo Alerta** (`#FBC64B`): atenção intermediária — hoje usado
  apenas no badge "Proposta enviada" (estado morno, nem positivo nem
  negativo). Reservar para esse tipo de estado intermediário; não usar
  como acento geral.

### Neutral
- **Azul-Marinho Corporativo** (`#1B3A66`): cor de texto padrão do corpo
  inteiro (`body`, via `--text`), títulos de página, logotipo, fundo da
  barra lateral (`Sidebar`) com texto branco por cima.
- **Branco** (`#FFFFFF`): fundo padrão (modo claro).
- **Cinza linha hover** (`#F9FAFB`, `bg-gray-50`): hover de linha de
  tabela.
- **Cinza campo somente-leitura** (`#F3F4F6`, `bg-gray-100`): input
  desabilitado/derivado (ex.: Cidade/UF preenchido por CEP).
- **Cinza texto secundário** (`#6B7280`, `text-gray-500`): rótulo abaixo
  do número nos cards do Painel.
- **Cinza neutro de badge** (`#9CA3AF`, `bg-gray-400`): status sem
  polaridade definida (ex.: licitação "Analisando"/"Desistimos").

### Named Rules
**The Signal Color Rule.** Ciano, amarelo e rosa nunca aparecem juntos
como decoração — cada um mapeia a exatamente um significado de status
(positivo / atenção / alerta). Uma nova cor de acento não deve ser
introduzida sem um significado de status novo e explícito.

## Typography

**Body Font:** stack sans-serif do sistema (`ui-sans-serif, system-ui,
-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) —
nenhuma fonte web customizada é carregada (`app/layout.tsx` não usa
`next/font`); isso é intencional (ferramenta interna, não marca voltada a
cliente final).

**Character:** neutra e utilitária — a hierarquia vem inteiramente de peso
e tamanho, nunca de família ou estilo decorativo.

### Hierarchy
- **Display** (700, 1.875rem/30px, 2.25rem): número de destaque dos cards
  do Painel (`text-3xl font-bold`), sempre em ciano.
- **Headline** (600, 1.5rem/24px, 2rem): título de página (`text-2xl
  font-semibold`, sempre em azul-marinho) — "Clientes", "Painel", etc.
- **Title** (600, 1.25rem/20px, 1.75rem): título de tela isolada, como o
  formulário de login.
- **Body** (400, 1rem/16px, 1.5rem): texto padrão de tabelas, formulários,
  parágrafos.
- **Label** (500, 0.75rem/12px, 1rem): texto de badge de status; também
  usado (em 0.875rem/`text-sm`) para nome de usuário na barra superior e
  mensagens de erro em rosa.

## Layout

Duas colunas fixas: barra lateral (`w-56`, 224px, fundo azul-marinho,
texto branco) + topbar (borda inferior, sem cor de fundo própria) +
conteúdo. Sem grid de página customizado além do usado no Painel (`grid
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` para os 4 cards de KPI).
Formulários usam `max-w-2xl` com `space-y-4` e grids internos (`grid-cols-2`
a `grid-cols-4`) para agrupar campos relacionados (ex.: CEP + Endereço,
Número + Complemento + Bairro + Cidade/UF). Responsividade hoje é mínima —
só o grid de cards do Painel tem breakpoints; listas/tabelas e formulários
não têm tratamento mobile dedicado ainda (ver Do's and Don'ts).

## Elevation & Depth

**Flat by design, decisão confirmada com o usuário.** Nenhum componente
usa `box-shadow` — nem os cards do Painel, nem o menu do Combobox (que usa
`shadow` do Tailwind apenas ali, a única exceção pontual do sistema, para
destacar a lista flutuante de sugestões). Profundidade não é transmitida
por sombra; é transmitida por contraste de cor sólida (ex.: barra lateral
azul-marinho vs. conteúdo branco).

### Named Rules
**The Flat-by-Design Rule.** Superfícies não recebem sombra em nenhum
estado (repouso, hover, foco). A única exceção tolerada é um menu
flutuante que precisa se destacar do conteúdo por trás dele (dropdown do
Combobox).

## Shapes

Cantos levemente arredondados em duas escalas: 4px (`rounded`, controles —
botões, inputs, badges) e 8px (`rounded-lg`, contêineres maiores — cartão
de login, cards do Painel). Nunca `rounded-full` ou geometria decorativa.

### Named Rules
**The Ambient Border Rule.** O projeto nunca sobrescreve `borderColor` no
Tailwind, então a classe `border` (sem sufixo de cor) herda `currentColor`
— a borda assume a cor de texto do contexto em que está (azul-marinho na
maior parte da UI, branco dentro da barra lateral). Isso é um
comportamento real do Tailwind v3 neste projeto, não uma cor de borda
neutra deliberada — uma nova tela que queira uma borda cinza neutra
precisa aplicar `border-gray-*` explicitamente; do contrário, herda a cor
do texto ambiente.

## Components

### Buttons
- **Shape:** cantos de 4px (`rounded`).
- **Primary:** fundo ciano, texto branco, `px-4 py-2` (16px/8px) — usado em
  "Salvar", "Novo cliente", "Entrar".
- **Hover / Focus:** não há tratamento de hover/focus definido hoje nos
  botões — lacuna real, não uma escolha estética (ver Do's and Don'ts).
- **Secondary / Ghost:** não existe uma variante secundária de botão
  formal; ações secundárias/destrutivas (ex.: "Sair") hoje são links de
  texto em rosa, não botões.

### Badges
- **Style:** fundo sólido colorido (ciano/rosa/amarelo/cinza conforme
  status), texto branco, `text-xs font-medium`, `rounded px-2 py-1`.
- **State:** cor = status; um segundo badge pode aparecer ao lado do
  primeiro para um estado composto (ex.: "Proposta encerrada" ao lado do
  status principal da licitação).

### Cards / Containers
- **Corner Style:** 8px (`rounded-lg`).
- **Background:** branco, sem cor diferenciada por tipo de card.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** `border` simples (ver The Ambient Border Rule).
- **Internal Padding:** 16px (`p-4`) nos cards do Painel; 24px (`p-6`) no
  cartão de login.

### Inputs / Fields
- **Style:** `border rounded px-3 py-2` (12px/8px), fundo branco mesmo em
  modo escuro (`input, select, textarea { background-color: var(--bg) }`
  em `globals.css`).
- **Focus:** não há estilo de foco customizado — usa o outline padrão do
  navegador.
- **Disabled/Readonly:** fundo cinza claro (`bg-gray-100`), ex.: campo
  Cidade/UF derivado do CEP.

### Navigation
- **Sidebar:** fundo azul-marinho fixo, texto branco, item de menu
  `rounded px-3 py-2 hover:bg-ciano` (sem estado "ativo" visual hoje — a
  rota atual não é destacada, lacuna real).
- **Topbar:** sem cor de fundo própria, apenas borda inferior; nome do
  usuário, alternância de tema e "Sair" alinhados à direita.

### Theming (claro/escuro)
Alternância de tema via `data-theme="dark"` no `<html>`, cookie
`theme=light|dark` e `prefers-color-scheme` como valor inicial padrão.
Hoje o modo escuro só recolore `body` (fundo/texto via variáveis CSS
`--bg`/`--text`/`--primary`/`--secondary`) — a maior parte dos componentes
usa classes Tailwind fixas (`bg-marinho`, `bg-ciano`, `bg-gray-50`, etc.)
que **não** têm variante `dark:`, então sidebar, cards, tabelas e badges
não mudam de cor no modo escuro hoje. Isso é uma lacuna real de
implementação, não uma escolha visual — ver Do's and Don'ts.

## Do's and Don'ts

### Do:
- **Do** usar cor como sinalização de status (The Signal Color Rule) —
  ciano para positivo/ação, amarelo para atenção intermediária, rosa para
  alerta/perigo.
- **Do** manter o sistema flat (The Flat-by-Design Rule) — não introduzir
  `box-shadow` em cards, botões ou inputs.
- **Do** aplicar `border-gray-*` explicitamente quando uma borda neutra
  cinza for realmente pretendida (The Ambient Border Rule) — não confiar
  em `border` sozinho para isso.
- **Do** manter a densidade compacta (`px-3 py-2` em inputs, `space-y-4`
  em formulários) — este não é um produto que precisa de respiro visual
  generoso.

### Don't:
- **Don't** introduzir uma fonte customizada ou tipografia decorativa — a
  stack do sistema operacional é intencional aqui.
- **Don't** adicionar `rounded-full` ou geometria decorativa a botões,
  cards ou badges — a linguagem de forma do sistema é 4px/8px, ponto.
- **Don't** tratar a ausência de estado hover/focus nos botões e a
  ausência de item "ativo" na Sidebar como comportamento confirmado — são
  lacunas reais do build atual, candidatas naturais a um `/impeccable
  polish` ou `/impeccable harden`, não um padrão a replicar em telas
  novas.
- **Don't** presumir que uma nova tela herda modo escuro automaticamente
  só por usar as cores de marca (`bg-marinho`, `bg-ciano`, etc.) — hoje
  essas classes não têm par `dark:`, então uma tela nova em modo escuro
  vai destoar do body a menos que isso seja tratado explicitamente.
