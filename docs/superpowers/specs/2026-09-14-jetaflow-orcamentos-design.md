# JetaFlow — Orçamentos (Design Spec)

**Sub-project 2 of 8** in the JetaFlow roadmap (see project memory `jetaflow-roadmap`). Builds on sub-project 1 (Fundação + Cadastros), which is complete and merged to `master`.

**Goal:** A quote engine for JETAPRINT's digital and offset printing services. An operator builds a multi-item quote for a client, the system calculates a price per item from substrate/machine/finishing/labor/overhead costs plus profit margin, and the quote can be sent, approved, duplicated, and printed/exported as PDF.

**Explicitly out of scope for this sub-project:** converting an approved quote into an Ordem de Serviço. The `Ordem de Serviço` model doesn't exist yet (sub-project 3). This sub-project's terminal status is `APROVADO`; the conversion action and any `OrdemServico` schema are built in sub-project 3.

---

## Global Constraints

These carry over from sub-project 1's established conventions (see `docs/superpowers/plans/2026-09-13-fundacao-cadastros.md` Global Constraints) and apply here too:

- Enumerated values (`status`, `tipo`) are Prisma `String` fields, not Prisma `enum` blocks — validity enforced by Zod at the API boundary and TypeScript union types.
- Business logic lives in `lib/services/*.ts` and `lib/services/orcamentoCalculo.ts` (pure calculation functions), unit-tested directly. API routes are thin wrappers (session lookup → service call → `handleApiError`).
- Tests run against the existing Vitest + Prisma test-DB infrastructure from sub-project 1 (no changes needed there).
- List search filters in JavaScript, not SQL `LIKE` (same reason as sub-project 1: SQLite connector limitation).
- Money/percentage fields stored as SQLite `Float`.
- Permission model: **any authenticated user (ADMIN or OPERADOR) can create, edit, send, approve, and duplicate quotes** — same permissive model already used for Clientes/Fornecedores, not the stricter ADMIN-only model used for Substratos/Equipamentos/Usuários/Configurações.
- Reuses `handleApiError` (already extended in sub-project 1's final review to map `ZodError`→400 and Prisma `P2002`→409) — no changes needed there either.

---

## Data Model

Two new Prisma models, plus one new field on the existing `ParametroCalculo`:

```prisma
model Orcamento {
  id            String          @id @default(cuid())
  numero        String          @unique
  clienteId     String
  cliente       Cliente         @relation(fields: [clienteId], references: [id])
  status        String          @default("RASCUNHO") // RASCUNHO | ENVIADO | APROVADO | EXPIRADO
  validadeDias  Int
  dataEnvio     DateTime?
  dataAprovacao DateTime?
  observacoes   String?
  itens         OrcamentoItem[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model OrcamentoItem {
  id                  String      @id @default(cuid())
  orcamentoId         String
  orcamento           Orcamento   @relation(fields: [orcamentoId], references: [id], onDelete: Cascade)
  descricao           String
  tipo                String      // DIGITAL | OFFSET
  substratoId         String
  substrato           Substrato   @relation("OrcamentoItemSubstratoPrincipal", fields: [substratoId], references: [id])
  larguraCm           Float
  alturaCm            Float
  tiragem             Int
  equipamentoId       String
  equipamento         Equipamento @relation(fields: [equipamentoId], references: [id])
  chapaId             String?
  chapa               Substrato?  @relation("OrcamentoItemChapa", fields: [chapaId], references: [id])
  chapaQuantidade     Float?
  tintaId             String?
  tinta               Substrato?  @relation("OrcamentoItemTinta", fields: [tintaId], references: [id])
  tintaQuantidade      Float?
  acabamentoDescricao String?
  acabamentoCusto     Float       @default(0)
  margemLucro         Float
  custoCalculado      Float
  precoFinal          Float
  ordem               Int
}
```

`ParametroCalculo` (existing model, sub-project 1) gains one field:

```prisma
model ParametroCalculo {
  // ...existing fields unchanged...
  validadePadraoDias Int @default(15)
}
```

`Substrato` and `Equipamento` (existing models) each gain the inverse relation fields needed for the three named relations above (`OrcamentoItemSubstratoPrincipal`, `OrcamentoItemChapa`, `OrcamentoItemTinta` on `Substrato`; a plain back-relation on `Equipamento`) — Prisma requires these on both sides.

**Snapshot design:** `custoCalculado` and `precoFinal` are computed and stored at save time, not derived live from current catalog prices. If a Substrato's `custoUnitario` changes later, existing quotes keep their original price — expected behavior for a quote system. `substratoId`/`chapaId`/`tintaId`/`equipamentoId` are kept as real relations (not just snapshotted values) so the UI can still show "Papel Couché 300g" instead of a raw ID, and so `onDelete` behavior for a deleted Substrato/Equipamento is defined (Substrato/Equipamento deletion already exists per sub-project 1 but has no UI trigger yet; if it's ever used, Prisma's default behavior for these optional/required relations needs to be decided at implementation time — required relations should probably use `onDelete: Restrict` to prevent deleting a Substrato/Equipamento referenced by an existing quote item).

**Numbering:** reuses `NumeracaoDocumento`/`listNumeracoes`/`updateNumeracao` from sub-project 1 (Task 11), which already seeds a `tipoDocumento: "ORCAMENTO"` row. Creating an `Orcamento` reads and increments `proximoNumero`, formatting `numero` as `<prefixo><número padded to digitos>`.

---

## Calculation Engine

Pure functions in `lib/services/orcamentoCalculo.ts`, taking plain data (no Prisma calls, no session) so they're trivially unit-testable and reusable for a live client-side preview.

**Per-item formula:**

```
areaM2 = (larguraCm / 100) × (alturaCm / 100)

custoSubstrato = areaM2 × tiragem × substrato.custoUnitario
                  × (1 + substrato.percentualPerda / 100)
                  × (1 + substrato.markup / 100)

custoChapa = tipo === "OFFSET" && chapa ? chapaQuantidade × chapa.custoUnitario : 0
custoTinta = tipo === "OFFSET" && tinta ? tintaQuantidade × tinta.custoUnitario : 0

tempoMinMaquina = (tiragem / equipamento.velocidade) + equipamento.tempoSetupMin
custoMaquina = (tempoMinMaquina / 60) × equipamento.custoHora
                × (1 + equipamento.percentualPerda / 100)

custoAcabamento = acabamentoCusto   // operator-entered, defaults to 0

custoMaoObra = (tempoMinMaquina / 60) × parametros.custoMaoObraHoraPadrao

subtotalAntesIndireto = custoSubstrato + custoChapa + custoTinta
                          + custoMaquina + custoAcabamento + custoMaoObra
custoIndireto = subtotalAntesIndireto × (parametros.percentualCustosIndiretosPadrao / 100)

custoCalculado = subtotalAntesIndireto + custoIndireto
precoFinal = custoCalculado × (1 + margemLucro / 100)
```

`margemLucro` defaults to `parametros.margemLucroPadrao` when an item is created, but is stored per-item and editable — so a specific quote line can carry a different margin without changing the global default.

**Quote total** = `Σ precoFinal` across all `itens`. Computed on read (not stored on `Orcamento` itself), to avoid a second place that can drift from the items.

**Validation invariants** (enforced by `lib/validators/orcamento.ts` at the API boundary, and defensively in the calculation function): `chapaId`/`chapaQuantidade` and `tintaId`/`tintaQuantidade` must be null/absent when `tipo === "DIGITAL"`; `larguraCm`/`alturaCm`/`tiragem` must be positive; `equipamento.velocidade` must be positive (guards a division by zero in `tempoMinMaquina`).

**Server is the source of truth:** the API always recomputes `custoCalculado`/`precoFinal` from the submitted inputs server-side before saving — it never trusts a client-submitted price. The UI calls the same calculation logic (imported directly, since it's a pure function with no server-only dependencies) to show a live preview as the operator fills the form, before submitting.

---

## Status Flow & Actions

```
RASCUNHO --[enviar]--> ENVIADO --[aprovar]--> APROVADO
```

- Items (`itens`) are editable while `status` is `RASCUNHO` or `ENVIADO`; locked once `APROVADO`.
- `aprovar` is only valid from `ENVIADO` (an operator can't approve a quote that was never marked sent).
- `EXPIRADO` is derived, not a manual transition: computed at read time (list and detail views) as `status !== "APROVADO" && createdAt + validadeDias < now()`. No cron/job — checked lazily on read, consistent with this project's small scale (same "no background jobs" pattern implicit in sub-project 1). If a quote reads as expired, the UI shows it as such but doesn't rewrite the stored `status` column (avoids a write-on-every-read pattern); `updateOrcamento`'s status-transition guard treats an expired-but-stored-as-RASCUNHO/ENVIADO quote the same as its stored status for edit/send purposes, but blocks `aprovar` if it's past validity.

**Actions** (`lib/services/orcamentoService.ts`, exposed via one route per action):

- `criarOrcamento` — allocates the next `ORCAMENTO` number, creates in `RASCUNHO`.
- `enviarOrcamento` — `RASCUNHO → ENVIADO`, sets `dataEnvio`.
- `aprovarOrcamento` — `ENVIADO → APROVADO`, sets `dataAprovacao`; rejects if past validity.
- `duplicarOrcamento` — clones `cliente` + all `itens` (new `id`s, same field values) into a fresh `RASCUNHO` with a newly-allocated number; clears `dataEnvio`/`dataAprovacao`.
- PDF generation (`lib/pdf/orcamentoPdf.tsx`, `@react-pdf/renderer`) — available in any status; not a state transition.
- WhatsApp send — client-side only: downloads the generated PDF, opens `wa.me/<cliente.telefone>?text=<mensagem>` in a new tab, and calls `enviarOrcamento` to mark the quote sent. No server-side WhatsApp integration.

---

## Components & File Structure

```
lib/services/orcamentoCalculo.ts        — pure pricing functions (unit-tested exhaustively)
lib/services/orcamentoService.ts        — CRUD, status transitions, numbering, duplicate
lib/validators/orcamento.ts             — Zod schemas (Orcamento, OrcamentoItem)
lib/pdf/orcamentoPdf.tsx                — @react-pdf/renderer document template

app/api/orcamentos/route.ts                     — GET (list+search), POST (create)
app/api/orcamentos/[id]/route.ts                — GET, PUT, DELETE
app/api/orcamentos/[id]/enviar/route.ts         — POST
app/api/orcamentos/[id]/aprovar/route.ts        — POST
app/api/orcamentos/[id]/duplicar/route.ts       — POST
app/api/orcamentos/[id]/pdf/route.ts            — GET (streams the PDF)

components/forms/OrcamentoForm.tsx              — cliente + itens list, top-level save
components/forms/OrcamentoItemForm.tsx          — one item: tipo, substrato Combobox,
                                                    chapa/tinta (conditional on tipo=OFFSET),
                                                    equipamento Combobox, formato/tiragem,
                                                    acabamento, margem, live calculated preview
app/(dashboard)/orcamentos/page.tsx             — list, search, status badges (incl. derived EXPIRADO)
app/(dashboard)/orcamentos/novo/page.tsx
app/(dashboard)/orcamentos/[id]/page.tsx        — view/edit + actions (enviar/aprovar/duplicar/PDF/WhatsApp)
```

Reuses `Combobox` (sub-project 1, `components/ui/Combobox.tsx`) for cliente/substrato/chapa/tinta/equipamento selection — no new autocomplete component needed.

`package.json` gains one new dependency: `@react-pdf/renderer` (pinned version, added in the implementation plan's first task per sub-project 1's convention of installing all deps once).

---

## Testing Strategy

- **`orcamentoCalculo.ts`**: the core of this sub-project's correctness. Hand-computed reference cases for: a DIGITAL item, an OFFSET item with chapa+tinta, an OFFSET item without chapa/tinta selected, a zero-finishing-cost item, and the validation-invariant rejections (chapa/tinta present on a DIGITAL item, zero/negative `velocidade`).
- **`orcamentoService.ts`**: tested against the real Prisma test DB (existing infrastructure) — creation allocates and increments the right numeração row, invalid status transitions (`aprovar` from `RASCUNHO`, editing an `APROVADO` quote) throw, `duplicarOrcamento` produces an independent copy (mutating the copy's items doesn't affect the original).
- **API routes**: manual verification via `npm run dev`/curl, per sub-project 1's established pattern (route handlers are thin wrappers, not unit-tested).
- **PDF generation**: manual verification (generate and open the file).
- **UI**: no new automated component tests planned beyond what individual implementation tasks judge necessary, consistent with sub-project 1's leaf-UI-task pattern.

---

## Open Items Carried Forward (not blocking, noted for implementation-time awareness)

- `Substrato`/`Equipamento` deletion already exists (service + API, no UI) from sub-project 1. Once `OrcamentoItem` references them, the implementation plan should decide the Prisma `onDelete` behavior for these relations (recommend `Restrict`, so a Substrato/Equipamento referenced by any quote item can't be deleted) — this wasn't a concern before this sub-project since nothing referenced Substrato/Equipamento yet.
- The known, pre-existing gaps from sub-project 1's final review (no debounce on list search, no `<label>` elements on forms, seeded ADMIN password / `NEXTAUTH_SECRET` needing rotation before any real deploy) are not addressed here — out of this sub-project's scope, tracked in project memory.
