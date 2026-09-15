# JetaFlow — Licitações (Design Spec)

**Sub-project 5 de 8** no roadmap do JetaFlow (ver memória de projeto `jetaflow-roadmap`). Constrói sobre os sub-projetos 1-4, todos completos e mesclados em `master`.

**Contexto técnico:** este sub-projeto foi precedido por um spike de viabilidade (2026-09-15) que confirmou a API pública de consultas do PNCP (Portal Nacional de Contratações Públicas): `https://pncp.gov.br/api/consulta`, sem autenticação, com spec OpenAPI em `/v3/api-docs`. O endpoint relevante é `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` ("Consultar Contratação"), testado ao vivo com dado real (200 OK, resposta JSON completa). O identificador usado é o "Número de Controle PNCP" — uma string composta `{cnpj}-{poder}-{sequencial}/{ano}` (ex: `01612441000107-1-000131/2026`) exibida na página de cada licitação no portal PNCP. **Nota de terminologia**: o termo "UASG" do roadmap original é específico de órgãos federais (sistema legado SIASG); o PNCP usa um identificador próprio (`codigoUnidade`) uniforme para todos os níveis de governo — este spec usa a terminologia do PNCP, que é mais abrangente.

**Goal:** Permitir que a JETAPRINT acompanhe, dentro do JetaFlow, as licitações que já decidiu monitorar — buscando os dados oficiais do PNCP (objeto, prazos, situação, valores) e registrando controle interno próprio (status de participação, valor da proposta, responsável, observações).

**Explicitamente fora de escopo para este sub-projeto:**
- Descoberta automática de licitações no PNCP (busca por palavra-chave/objeto) — o operador identifica a licitação de interesse fora do sistema (no portal PNCP) e cola o identificador no JetaFlow.
- Atualização automática/periódica dos dados do PNCP — só há um botão "Atualizar" manual na tela de detalhe.
- Qualquer vínculo com Orçamentos/Ordens de Serviço — uma licitação acompanhada aqui não gera automaticamente um Orçamento; se a JETAPRINT ganhar, o operador cria o Orçamento manualmente como já faz hoje.
- Histórico de mudanças — só o estado atual da licitação é guardado (snapshot dos dados do PNCP + estado interno), sem log de alterações.
- Qualquer chamada às APIs de manutenção do PNCP (que exigem autenticação) — este sub-projeto só consome as APIs públicas de consulta.

---

## Global Constraints

Herdadas das convenções já estabelecidas nos sub-projetos 1-4:

- `Licitacao.statusInterno` é um campo `String` do Prisma, não um `enum` — validade garantida por Zod/TypeScript, mesmo padrão de `Orcamento.status`/`OrdemServico.estagio`.
- Lógica de negócio em `lib/services/licitacaoService.ts`, testada contra o Prisma de teste real. Rotas de API são wrappers finos (sessão → serviço → `handleApiError`).
- **Modelo de permissão: qualquer usuário autenticado (ADMIN ou OPERADOR) faz tudo** neste módulo — mesmo padrão permissivo de Clientes/Fornecedores/Orçamentos/Ordens de Serviço/Etiquetas e Expedição, não o modelo restrito de Substratos/Equipamentos/Usuários/Configurações. Nenhum `assertAdmin`/`isAdmin` neste módulo.
- Busca na lista filtra em JavaScript, não `LIKE` do SQL — mesma razão dos módulos anteriores (limitação do conector SQLite).
- O cliente HTTP pro PNCP (`lib/external/pncp.ts`) segue o padrão de `lib/external/brasilapi.ts`/`viacep.ts`: função fina, retorna dado tipado ou `null` em caso de erro, **sempre envia um header `User-Agent`** — lição do sub-projeto 1, onde a ausência desse header causou 403 na consulta de CNPJ via BrasilAPI.
- Lógica pura e reutilizável (cálculo de "proposta encerrada") vive em um módulo sem imports (`lib/services/licitacaoCalculo.ts`), mesmo padrão de `orcamentoCalculo.ts`/`ordemServicoCalculo.ts`/`expedicaoCalculo.ts`.

---

## Modelo de Dados

Um novo model Prisma:

```prisma
model Licitacao {
  id                       String    @id @default(cuid())
  numeroControlePNCP       String    @unique
  cnpjOrgao                String
  anoCompra                Int
  sequencialCompra         Int

  orgaoNome                String
  unidadeNome              String
  numeroCompra             String
  objetoCompra             String
  modalidadeNome           String
  situacaoCompraNome       String
  valorTotalEstimado       Float?
  valorTotalHomologado     Float?
  dataAberturaProposta     DateTime?
  dataEncerramentoProposta DateTime?
  dataAtualizacaoPNCP      DateTime

  statusInterno            String    @default("ANALISANDO")
  valorProposta            Float?
  responsavel              String?
  observacoes              String?

  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}
```

**`statusInterno`** (union TypeScript, não enum Prisma — mesma convenção de `Role`/`TipoPessoa`/`Orcamento.status`/etc.):
```ts
export type StatusInternoLicitacao =
  | "ANALISANDO"
  | "VAMOS_PARTICIPAR"
  | "PROPOSTA_ENVIADA"
  | "GANHAMOS"
  | "PERDEMOS"
  | "DESISTIMOS";
```
Lista ordenada fixa, fonte única de verdade em `licitacaoCalculo.ts` (rótulos em português + cor de badge), mesmo padrão de `ESTAGIOS_OS`.

**Por que guardar um snapshot dos dados do PNCP em vez de buscar ao vivo a cada tela:** o PNCP é uma fonte externa fora do controle do JetaFlow — se a API estiver fora do ar ou lenta, a tela de listagem/detalhe não pode quebrar. O snapshot é atualizado sob demanda (botão "Atualizar"), com `dataAtualizacaoPNCP` mostrando quando foi a última busca — mesma filosofia de `OrcamentoItem.custoCalculado`/`precoFinal` serem snapshots, não recomputados a cada leitura.

**`cnpjOrgao`/`anoCompra`/`sequencialCompra`** são guardados separadamente (não só o `numeroControlePNCP` composto) porque são exatamente os três parâmetros que o endpoint `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` do PNCP espera — evita reparsear a string composta toda vez que o botão "Atualizar" é clicado.

---

## Cliente PNCP

`lib/external/pncp.ts` (segue o padrão de `brasilapi.ts`, zero uso de Prisma):

```ts
export interface PncpContratacaoResult {
  orgaoNome: string;
  unidadeNome: string;
  numeroCompra: string;
  objetoCompra: string;
  modalidadeNome: string;
  situacaoCompraNome: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
}

export interface NumeroControlePNCPParseado {
  cnpj: string;
  ano: number;
  sequencial: number;
}

export function parseNumeroControlePNCP(numero: string): NumeroControlePNCPParseado | null;

export async function buscarContratacaoPNCP(
  cnpj: string,
  ano: number,
  sequencial: number
): Promise<PncpContratacaoResult | null>;
```

- `parseNumeroControlePNCP` extrai `cnpj`/`ano`/`sequencial` do formato `{14 dígitos}-{1 dígito}-{sequencial}/{ano}` (ex: `01612441000107-1-000131/2026`) via regex; retorna `null` se o formato não bater — o "poder" (segundo grupo, `1` no exemplo) não é usado pela API de consulta específica e é descartado após a validação do formato.
- `buscarContratacaoPNCP` chama `GET https://pncp.gov.br/api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` com header `User-Agent`, mapeia a resposta (`orgaoEntidade.razaoSocial`, `unidadeOrgao.nomeUnidade`, `numeroCompra`, `objetoCompra`, `modalidadeNome`, `situacaoCompraNome`, `valorTotalEstimado`, `valorTotalHomologado`, `dataAberturaProposta`, `dataEncerramentoProposta`) para `PncpContratacaoResult`. Retorna `null` em qualquer falha (404, erro de rede, JSON inesperado) — o chamador decide a mensagem de erro amigável.

---

## Camada de Serviço

`lib/services/licitacaoCalculo.ts` (puro, sem imports):
```ts
export const STATUS_INTERNO_LICITACAO = [
  "ANALISANDO", "VAMOS_PARTICIPAR", "PROPOSTA_ENVIADA",
  "GANHAMOS", "PERDEMOS", "DESISTIMOS",
] as const;

export function propostaEncerrada(dataEncerramentoProposta: Date | string | null): boolean {
  if (!dataEncerramentoProposta) return false;
  return new Date(dataEncerramentoProposta) < new Date();
}
```

`lib/services/licitacaoService.ts`:

- **`cadastrarLicitacao(numeroControlePNCP: string): Promise<Licitacao>`**
  - Chama `parseNumeroControlePNCP`; lança `ForbiddenError("Número de Controle PNCP em formato inválido")` se não bater o formato (erro de validação de entrada do usuário, não uma falha de infraestrutura — `ForbiddenError` é usado aqui seguindo a convenção já estabelecida de usá-lo para "operação rejeitada por regra de negócio").
  - Verifica duplicidade via `prisma.licitacao.findUnique({ where: { numeroControlePNCP } })`; lança `ForbiddenError("Esta licitação já está cadastrada")` se já existir — checado **antes** de chamar o PNCP, pra evitar uma chamada externa desnecessária quando o erro já é detectável localmente.
  - Chama `buscarContratacaoPNCP`; lança `NotFoundError("Licitação não encontrada no PNCP")` se retornar `null`.
  - Cria o registro com `statusInterno: "ANALISANDO"` e `dataAtualizacaoPNCP: new Date()`.

- **`atualizarDadosPNCP(id: string): Promise<Licitacao>`** — busca a licitação existente, rechama `buscarContratacaoPNCP` com os `cnpjOrgao`/`anoCompra`/`sequencialCompra` já salvos, lança `NotFoundError("Licitação não encontrada no PNCP")` se o PNCP retornar `null` (a licitação pode ter sido removida/ficou indisponível), senão atualiza os campos de snapshot + `dataAtualizacaoPNCP`. Não altera nenhum campo interno.

- **`atualizarDadosInternos(id: string, input: LicitacaoInternoInput): Promise<Licitacao>`** — atualiza apenas `statusInterno`/`valorProposta`/`responsavel`/`observacoes`.

- **`listarLicitacoes(search?: string): Promise<Licitacao[]>`** — busca todas, filtra em JS por `objetoCompra`/`orgaoNome`/`numeroCompra` (case-insensitive).

- **`buscarLicitacao(id: string): Promise<Licitacao>`** — `NotFoundError` se ausente.

- **`excluirLicitacao(id: string): Promise<void>`** — exclusão direta, sem restrições (não há nenhuma outra entidade do JetaFlow referenciando `Licitacao`).

---

## Modelo de Permissão

Nenhum `assertAdmin`/`isAdmin` neste módulo. Toda rota de API checa apenas `getSessionRole()` por uma sessão não-nula (401 se ausente) — igual a toda rota de Orçamentos/Ordens de Serviço/Etiquetas e Expedição.

---

## Rotas de API

```
app/api/licitacoes/route.ts              — GET (listar+busca), POST (cadastrar via numeroControlePNCP)
app/api/licitacoes/[id]/route.ts         — GET, PUT (dados internos), DELETE
app/api/licitacoes/[id]/atualizar/route.ts — POST (rebusca no PNCP)
```

`POST /api/licitacoes` body: `{ numeroControlePNCP: string }`, validado por `licitacaoInputSchema` (Zod). Retorna 201.

`PUT /api/licitacoes/[id]` body: `{ statusInterno: string; valorProposta?: number | null; responsavel?: string | null; observacoes?: string | null }`, validado por `licitacaoInternoInputSchema`.

---

## Componentes e Páginas

```
components/LicitacaoStatusBadge.tsx        — badge do statusInterno (compartilhado entre lista e detalhe),
                                               com cor por status e indicação de "proposta encerrada"
                                               (via propostaEncerrada, mesmo padrão do badge de OS)
app/(dashboard)/licitacoes/page.tsx        — lista, busca, badge de status
app/(dashboard)/licitacoes/nova/page.tsx   — form: campo único pra colar o Número de Controle PNCP,
                                               submete a POST /api/licitacoes, navega pro detalhe da
                                               licitação criada
app/(dashboard)/licitacoes/[id]/page.tsx           — server wrapper (busca + notFound)
app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx
                                            — dados do PNCP (somente leitura: órgão, unidade, objeto,
                                               modalidade, situação, valores, prazos, "atualizado em"),
                                               botão "Atualizar" (chama o endpoint de atualização),
                                               form de dados internos editáveis (status/valor
                                               proposta/responsável/observações), botão "Excluir"
```

---

## Estratégia de Testes

- **`licitacaoService.ts`**: testado contra o Prisma de teste real — cadastro (rejeita formato inválido, rejeita não encontrado no PNCP, rejeita duplicata), atualização de dados do PNCP, atualização de dados internos (não mexe no snapshot), listagem/busca, exclusão. As chamadas reais ao `buscarContratacaoPNCP` dentro desses testes usam a API real do PNCP (sem mock) — mesma decisão de design de não mockar integrações externas neste projeto até agora (ver `brasilapi.test.ts`/`viacep.test.ts` existentes), aceitando que os testes dependem de rede.
- **`licitacaoCalculo.ts`**: casos verificados manualmente — sem prazo (não encerrada), prazo no futuro (não encerrada), prazo no passado (encerrada).
- **`pncp.ts`**: `parseNumeroControlePNCP` testado com casos válidos/inválidos (função pura). `buscarContratacaoPNCP` verificado manualmente contra a API real (mesmo padrão de verificação manual das rotas de API).
- **Rotas de API**: verificação manual via `npm run dev`, padrão já estabelecido.
- **UI**: sem testes automatizados novos além do que cada tarefa de implementação julgar necessário, consistente com o padrão de UI-folha dos sub-projetos anteriores.
