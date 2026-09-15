# JetaFlow — Ordens de Serviço (Design Spec)

**Sub-project 3 of 8** in the JetaFlow roadmap (see project memory `jetaflow-roadmap`). Builds on sub-project 1 (Fundação + Cadastros) and sub-project 2 (Orçamentos), both complete and merged to `master`.

**Goal:** A production-floor tracking tool for JETAPRINT. An approved Orçamento converts into exactly one Ordem de Serviço (OS), which then moves through a fixed sequence of 8 production stages until completed, with a visible delivery deadline so overdue jobs are easy to spot.

**Explicitly out of scope for this sub-project:**
- OS-only creation without a prior Orçamento (every OS traces back to exactly one approved quote).
- Per-item stage tracking (the whole OS moves through stages together, not individual line items).
- A full historical audit trail of every stage transition (only the current stage and when it started).
- A printable/PDF work-order document (shipping labels belong to sub-project 4, "Etiquetas e Expedição", which is a separate concern).
- Wiring the Painel (dashboard) placeholder cards ("Orçamentos pendentes", "OS em produção") to real data — deferred until the full roadmap's modules exist, to refine the dashboard once rather than piecemeal per sub-project.

---

## Global Constraints

Carried over from sub-project 1/2's established conventions:

- Enumerated values (`OrdemServico.estagio`) are Prisma `String` fields, not Prisma `enum` blocks — validity enforced by Zod at the API boundary and TypeScript union types.
- Business logic lives in `lib/services/ordemServicoService.ts`, unit-tested directly against the real Prisma test DB. API routes are thin wrappers (session lookup → service call → `handleApiError`).
- **Permission model: any authenticated user (ADMIN or OPERADOR) can convert an orçamento to an OS, and advance/revert its stage, and edit its prazo/observações** — same permissive model as Orçamentos/Clientes/Fornecedores, not the stricter ADMIN-only model used for Substratos/Equipamentos/Usuários/Configurações.
- List search filters in JavaScript, not SQL `LIKE` (SQLite connector limitation, same reason as prior sub-projects).
- Reuses `handleApiError`, `alocarProximoNumero` (already role-agnostic, already has an `"OS"` `NumeracaoDocumento` row seeded since sub-project 1), and the shared-pure-function pattern established in sub-project 2's final review (a date-derived boolean like `estaExpirado`/`calcularEstaExpirado` must live in one pure, client-safe module and be imported everywhere it's needed — never re-duplicated per page).

---

## Data Model

One new Prisma model:

```prisma
model OrdemServico {
  id           String    @id @default(cuid())
  numero       String    @unique
  orcamentoId  String    @unique
  orcamento    Orcamento @relation(fields: [orcamentoId], references: [id], onDelete: Restrict)
  estagio      String    @default("ARQUIVO_RECEBIDO")
  estagioDesde DateTime  @default(now())
  prazoEntrega DateTime?
  observacoes  String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

`Orcamento` (existing model) gains the inverse relation field: `ordemServico OrdemServico?`.

**No item duplication.** `OrdemServico` does not copy `Orcamento`'s items — it reads them through the `orcamento` relation (`orcamento.itens`, `orcamento.cliente`). An `Orcamento` is already immutable once `APROVADO` (enforced in sub-project 2), so there's no drift risk in relying on the live relation instead of a snapshot.

**Why `onDelete: Restrict` on `orcamentoId`:** consistent with sub-project 2's rule for required catalog/parent relations — an `Orcamento` that has been converted to an OS can't be deleted out from under it. (Note: `excluirOrcamento`, added in sub-project 2's final review, already blocks deleting an `APROVADO` orçamento — since conversion requires `APROVADO`, this is defense-in-depth, not the only guard.)

**Estágio values** (TypeScript union, not Prisma enum — same convention as `Role`/`TipoPessoa`/etc.):
```ts
export type EstagioOS =
  | "ARQUIVO_RECEBIDO"
  | "PRE_IMPRESSAO"
  | "PRODUCAO"
  | "ACABAMENTO"
  | "CONFERENCIA"
  | "EMBALAGEM"
  | "EXPEDICAO"
  | "CONCLUIDO";
```
This fixed, ordered array is the source of truth for what "next"/"previous" means — both the service layer's transition logic and the UI's stage display derive from the same ordered list.

---

## Service Layer

`lib/services/ordemServicoService.ts`:

- **`converterEmOS(orcamentoId: string): Promise<OrdemServicoComOrcamento>`**
  - Loads the orçamento (`buscarOrcamento` from `orcamentoService.ts`); throws `ForbiddenError` if `status !== "APROVADO"`.
  - Throws `ForbiddenError("Este orçamento já foi convertido em OS")` if an `OrdemServico` already exists for it (checked via `prisma.ordemServico.findUnique({ where: { orcamentoId } })` before create — the schema's `@unique` on `orcamentoId` is the backstop, but a friendly pre-check avoids surfacing a raw Prisma P2002).
  - Allocates a number via `alocarProximoNumero("OS")` (already built, already role-agnostic, already has a seeded `NumeracaoDocumento` row for `"OS"`).
  - Creates the `OrdemServico` in `ARQUIVO_RECEBIDO`, `estagioDesde: now()`.

- **`listarOrdensServico(search?: string): Promise<OrdemServicoComOrcamento[]>`** — fetches all rows (with `orcamento`/`orcamento.cliente`/`orcamento.itens` included) and filters in JS by `numero` or `orcamento.cliente.nome`.

- **`buscarOrdemServico(id: string): Promise<OrdemServicoComOrcamento>`** — throws `NotFoundError` if missing.

- **`atualizarOrdemServico(id: string, input: { prazoEntrega?: Date | null; observacoes?: string | null }): Promise<OrdemServicoComOrcamento>`** — updates only the editable fields (prazo/observações); no status/stage/orcamento changes through this path.

- **`avancarEstagio(id: string): Promise<OrdemServicoComOrcamento>`** — throws `ForbiddenError` if already `CONCLUIDO`; otherwise moves to the next entry in the fixed `ESTAGIOS` array, updates `estagioDesde`.

- **`voltarEstagio(id: string): Promise<OrdemServicoComOrcamento>`** — throws `ForbiddenError` if already `ARQUIVO_RECEBIDO`; otherwise moves to the previous entry, updates `estagioDesde`.

`lib/services/ordemServicoCalculo.ts` (pure, no Prisma import — same pattern as `orcamentoCalculo.ts`):

```ts
export const ESTAGIOS_OS = [
  "ARQUIVO_RECEBIDO", "PRE_IMPRESSAO", "PRODUCAO", "ACABAMENTO",
  "CONFERENCIA", "EMBALAGEM", "EXPEDICAO", "CONCLUIDO",
] as const;

export function estaAtrasada(estagio: string, prazoEntrega: Date | string | null): boolean {
  if (estagio === "CONCLUIDO" || !prazoEntrega) return false;
  return new Date(prazoEntrega) < new Date();
}
```
Both the service layer and the list/detail pages import this — the shape of `ESTAGIOS_OS` is also imported by `avancarEstagio`/`voltarEstagio` to look up "next"/"previous", so the ordering is defined in exactly one place.

---

## Permission Model

No `assertAdmin`/`isAdmin` anywhere in this module's own code. Every API route checks only `getSessionRole()` for a non-null session (401 if absent) — identical shape to every Orçamentos route.

---

## API Routes

```
app/api/orcamentos/[id]/converter-os/route.ts   — POST (creates the OS; lives under /orcamentos/ since the
                                                    action originates from the Orçamento detail page)
app/api/ordens-servico/route.ts                 — GET (list + search)
app/api/ordens-servico/[id]/route.ts            — GET, PUT (prazo/observações)
app/api/ordens-servico/[id]/avancar/route.ts    — POST
app/api/ordens-servico/[id]/voltar/route.ts     — POST
```

---

## Components & Pages

```
components/OrdemServicoEstagioBadge.tsx  — small presentational component: renders the current estágio
                                             label (+ "atrasada" styling if estaAtrasada is true) — shared
                                             between the list and detail pages so the visual language and
                                             the "is it late" logic aren't duplicated
app/(dashboard)/ordens-servico/page.tsx           — list, search, estágio badge, atrasada highlight
app/(dashboard)/ordens-servico/[id]/page.tsx      — detail: cliente + itens + preços (read through
                                                      orcamento.itens, read-only — OS never edits pricing),
                                                      current estágio + "há quanto tempo" (derived from
                                                      estagioDesde), Avançar/Voltar buttons, editable
                                                      prazo/observações
```

**On the Orçamento side:** `OrcamentoDetalheClient.tsx` (sub-project 2) gains a "Converter em OS" button, shown only when `status === "APROVADO"` and no OS exists yet for that orçamento (the server wrapper passes an `ordemServicoId: string | null` prop so the client knows whether to show the button or a "Ver OS" link instead). Clicking it calls the new `POST /api/orcamentos/[id]/converter-os` and navigates to the new OS's detail page on success.

**No new `Orcamento.status` value.** Sub-project 2's original brainstorm mentioned a `CONVERTIDO_OS` status conceptually, but sub-project 2 deliberately stopped its status enum at `APROVADO` and deferred the question to this sub-project. The resolution: do **not** add a `CONVERTIDO_OS` (or similar) value to `Orcamento.status` — conversion state is derived from whether an `OrdemServico` row exists for that `orcamentoId` (a single source of truth via the relation), not tracked redundantly as a second status field that could drift out of sync.

---

## Testing Strategy

- **`ordemServicoService.ts`**: tested against the real Prisma test DB — conversion (allocates and increments the `"OS"` numeração row, rejects a non-`APROVADO` orçamento, rejects converting the same orçamento twice), stage transitions (rejects advancing past `CONCLUIDO`, rejects reverting past `ARQUIVO_RECEBIDO`, correctly walks the full 8-stage sequence forward and back), `atualizarOrdemServico` (updates only prazo/observações, doesn't touch estágio).
- **`estaAtrasada`**: hand-verified cases — no prazo set (never late), prazo in the future (not late), prazo in the past but `CONCLUIDO` (not late), prazo in the past and not `CONCLUIDO` (late).
- **API routes**: manual verification via `npm run dev`/curl, per the established pattern (thin wrappers, not unit-tested).
- **UI**: no new automated component tests beyond what individual implementation tasks judge necessary, consistent with prior sub-projects' leaf-UI-task pattern.

---

## Open Items Carried Forward (not blocking, noted for implementation-time awareness)

- Sub-project 2's final review found that OPERADOR needed a role-agnostic read path for Substrato/Equipamento cost fields (`/api/catalogo-precificacao/*`) because the live price-preview needed them. This sub-project's OS detail page displays `orcamento.itens[].precoFinal` (already-computed, stored values) — it does NOT recompute pricing or need catalog cost data, so this class of bug should not recur here. Worth double-checking during implementation that nothing in the OS UI accidentally re-fetches Substrato/Equipamento catalog data through an ADMIN-gated route.
- `NumeracaoDocumento`'s `"OS"` row was seeded in sub-project 1 (Task 11) alongside `"ORCAMENTO"` — confirm its `prefixo`/`digitos` defaults are sensible for OS numbering specifically (they may currently just mirror whatever sub-project 1's seed script set, likely worth a quick check rather than an assumption).
