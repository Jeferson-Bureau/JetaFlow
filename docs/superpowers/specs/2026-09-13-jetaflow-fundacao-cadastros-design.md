# JetaFlow — Fundação + Cadastros (Sub-projeto 1)

## Contexto e roadmap geral

O JetaFlow é um sistema de gestão para a JETAPRINT (gráfica digital e offset),
composto por 8 módulos de negócio. O projeto é grande demais para uma única
spec, por isso foi dividido em sub-projetos, construídos nesta ordem:

1. **Fundação + Cadastros** (este documento) — login/permissões, layout,
   tema, Configurações, Clientes, Fornecedores, Precificação e Substratos.
2. **Orçamentos** — motor de cálculo digital/offset, impressão, PDF,
   WhatsApp, duplicar, aprovar, converter em OS.
3. **Ordens de Serviço** — fluxo de etapas de produção.
4. **Etiquetas e Expedição** — geração de etiquetas com QR/código de barras.
5. **Licitações** — integração com o PNCP (número da licitação + UASG).
   Requer um spike de viabilidade antes do design completo, já que depende
   de endpoints públicos que podem mudar ou ter disponibilidade instável.
6. **Painel** — versão inicial simples desde o sub-projeto 1, refinado
   conforme os demais módulos entram em produção.

Cada sub-projeto tem seu próprio ciclo de design → plano → implementação.

## Plataforma e stack (decisão vale para todo o projeto)

- **Uso**: aplicativo web, 1-3 usuários simultâneos, rodando localmente na
  rede da gráfica (sem necessidade de alta escala).
- **Stack**: Next.js (App Router) + TypeScript, SQLite + Prisma ORM,
  Tailwind CSS, NextAuth (modo credenciais) para autenticação.
- Estrutura de pastas por módulo: `/app/clientes`, `/app/fornecedores`,
  `/app/precificacao`, `/app/configuracoes`, etc.
- Documentos de negócio de referência (tabelas de preço, fichas técnicas de
  equipamentos, planilha de custo de papel) ficam em `referencias/` na raiz
  do projeto, fora do controle de versão — usados como fonte de dados ao
  popular o cadastro de Precificação e Substratos.

## Identidade visual

Paleta base (usada via tokens de tema, não aplicada literalmente em todo
elemento):

| Cor | HEX | Uso |
|---|---|---|
| Azul-marinho | #1B3A66 | Texto, logotipo, títulos, rodapé |
| Azul-ciano | #229DCF | Destaques, links, elementos informativos, botão primário |
| Amarelo | #FBC64B | Chamadas de atenção e detalhes |
| Rosa | #E23D7D | Destaques, botões secundários, elementos criativos |
| Branco | #FFFFFF | Fundo (modo claro) |

- Modo claro: fundo branco, texto azul-marinho, botão primário ciano.
- Modo escuro: fundo derivado do azul-marinho escurecido, texto claro,
  ciano e rosa com mais destaque para manter contraste.
- Toggle de tema salvo em cookie/localStorage, aplicado via atributo
  `data-theme` no elemento raiz.

## Autenticação e permissões

- Tabela `User`: nome, e-mail/usuário, senha (hash bcrypt), `role`
  (`ADMIN` | `OPERADOR`), ativo/inativo.
- Middleware protege todas as rotas exceto `/login`.
- **Administrador**: acesso total — inclusive Configurações e custos/markups
  em Precificação, gestão de usuários.
- **Operador**: acesso a Clientes, Fornecedores, Orçamentos, OS, Etiquetas,
  Licitações — sem visibilidade de custos internos/markups em Precificação e
  sem acesso a Configurações.
- Sem fluxo de "esqueci minha senha" por e-mail nesta fase — reset feito
  pelo Admin na tela de usuários.

## Layout

- Shell fixo: barra lateral com os 9 módulos (Painel, Orçamentos, Ordens de
  Serviço, Clientes, Fornecedores, Etiquetas, Licitações, Precificação,
  Configurações), topo com nome do usuário, toggle de tema, logotipo.
- Painel (dashboard) nesta fase: layout pronto com cards placeholder
  ("Orçamentos pendentes: —", "OS em produção: —"); dados reais entram
  quando os módulos 2-4 existirem.

## Configurações

- **Dados da empresa**: razão social, CNPJ, IE, endereço, telefone,
  logotipo (upload) — usado em PDFs e etiquetas.
- **Usuários**: CRUD de usuários, definição de role, reset de senha.
- **Numeração de documentos**: formato configurável por tipo de documento
  (ex: `ORC-2026-0001`, `OS-2026-0001`), contador automático reiniciado por
  ano, editável pelo Admin.
- **Parâmetros de cálculo**: valores padrão usados pelo motor de orçamento
  do sub-projeto 2 (margem de lucro padrão, custo de mão de obra/hora
  padrão, % de custos indiretos padrão). A tela existe aqui; a lógica que
  consome esses valores é do próximo sub-projeto.
- **WhatsApp**: campo com o número de WhatsApp da gráfica. O método de
  envio (link `wa.me` vs. API) é decidido no design do sub-projeto 2.
- **Tema padrão**: claro / escuro / automático.

## Clientes e Fornecedores (cadastro básico)

**Cliente**: tipo (PF/PJ), nome/razão social, CPF/CNPJ, IE (se PJ),
telefone/WhatsApp, e-mail, endereço, prazo de pagamento padrão (dias),
observações.

**Fornecedor**: razão social, CNPJ, contato, telefone, e-mail, endereço,
categoria de fornecimento (papel, tinta, chapas, acabamento, etc. —
relaciona com Precificação e Substratos).

**Autopreenchimento**:
- Ao digitar o CNPJ, busca automática de razão social e endereço via API
  pública (BrasilAPI ou ReceitaWS).
- Ao digitar o CEP, preenche o endereço via ViaCEP.
- Campos de relação (ex: fornecedor de um material) usam autocomplete
  sobre os cadastros já existentes (componente `<Combobox>` reutilizável).

## Precificação e Substratos

Campos comuns a todo material: nome, fornecedor (relação), unidade de
medida, custo unitário, % de perda padrão, markup, ativo/inativo.

Modelo de dados: uma tabela `Substrato` com os campos comuns + `tipo`
(enum) + `atributos` (JSON) para os campos específicos do tipo — evita
dezenas de colunas nulas e facilita ajustes futuros nos campos por tipo. A
interface renderiza o formulário correto conforme o `tipo` selecionado.

| Tipo | Campos extras (em `atributos`) |
|---|---|
| Papel | gramatura (g/m²), formato da folha, acabamento superficial |
| Lona | tipo (frontlight/backlight/blackout), largura da bobina, gramatura |
| Adesivo | tipo (vinil brilho/fosco/perfurado/refletivo), largura da bobina |
| PVC | espessura (mm), formato da chapa |
| Acrílico | espessura (mm), formato da chapa, transparência/cor |
| Chapa offset | formato, tipo CTP |
| Tinta | sistema (CMYK/Pantone), rendimento, uso (offset/digital/UV) |
| Verniz | tipo (UV total/localizado), rendimento |
| Laminado | tipo (BOPP fosco/brilho/soft touch), largura da bobina |

**Equipamento**: nome, tipo (digital/offset), velocidade (folhas ou
m²/hora), formato máximo, custo por hora, tempo de setup padrão, % de
perda padrão, acabamentos suportados.

## Fora de escopo neste sub-projeto

- Motor de cálculo de orçamento (usa os dados cadastrados aqui, mas a
  lógica de cálculo é do sub-projeto 2).
- Envio por WhatsApp e geração de PDF de orçamento.
- Fluxo de Ordens de Serviço, Etiquetas e Licitações.
- Dados reais no Painel (fica com placeholders nesta fase).

## Testes

- Testes unitários para regras de permissão (Admin vs Operador).
- Testes de integração para autopreenchimento (CNPJ/CEP), com mocks das
  APIs externas.
- Testes de CRUD para Clientes, Fornecedores, Substratos e Equipamentos.
