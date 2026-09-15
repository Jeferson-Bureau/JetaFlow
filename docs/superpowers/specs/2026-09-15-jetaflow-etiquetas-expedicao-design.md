# JetaFlow — Etiquetas e Expedição (Design Spec)

**Sub-project 4 of 8** in the JetaFlow roadmap (see project memory `jetaflow-roadmap`). Builds on sub-project 1 (Fundação + Cadastros), sub-project 2 (Orçamentos), and sub-project 3 (Ordens de Serviço), all complete and merged to `master`.

**Goal:** From a completed Ordem de Serviço, generate a set of shipping labels — one per physical volume (box/roll) — each carrying the client's address, the OS number, a per-volume internal code, and a QR code. A dedicated "conferência" screen lets an operator scan/type each volume's code to mark it as separated before dispatch.

**Explicitly out of scope for this sub-project:**
- Etiquetas created independently of an OS (every label traces back to exactly one `OrdemServico`).
- Any interaction with `OrdemServico.estagio` — conferência progress is purely informational and never advances or reverts the OS's stage automatically.
- Any public/external-facing page or URL — the QR code encodes the internal `codigoInterno` as plain text for internal scanning, not a link.
- A dedicated barcode-scanner integration protocol — the conference screen just accepts typed/scanned text into a normal input (works with any scanner or app that types text + Enter, keyboard-emulation style).
- A history of every conference attempt — only the volume's current `conferido`/`conferidoEm` state is tracked, no audit log.
- Carrier/shipping-provider integration (tracking numbers, label formats mandated by a courier, etc.) — this is an internal packing-and-dispatch aid only.

---

## Global Constraints

Carried over from sub-project 1/2/3's established conventions:

- Business logic lives in `lib/services/expedicaoService.ts`, unit-tested directly against the real Prisma test DB. API routes are thin wrappers (session lookup → service call → `handleApiError`).
- **Permission model: any authenticated user (ADMIN or OPERADOR) can do everything in this module** — same permissive model as Orçamentos/Ordens de Serviço, not the stricter ADMIN-only model used for Substratos/Equipamentos/Usuários/Configurações. No `assertAdmin`/`isAdmin` anywhere in this module's code.
- Pure, client-safe calculation logic lives in a zero-import module (`lib/services/expedicaoCalculo.ts`), following the `orcamentoCalculo.ts`/`ordemServicoCalculo.ts` pattern — the internal-code format and conference-progress counting are defined once and reused everywhere they're needed.
- PDF generation follows the existing `app/api/orcamentos/[id]/pdf/route.tsx` pattern: `@react-pdf/renderer`'s `renderToBuffer`, a thin GET route, `Content-Disposition: attachment`.
- `tests/setup.ts`'s `TABLES` reset array must list `Volume` and `Expedicao` before `OrdemServico` (children before parents, for FK-safe deletes under `onDelete: Restrict`/`Cascade`).

---

## Data Model

Two new Prisma models:

```prisma
model Expedicao {
  id             String   @id @default(cuid())
  ordemServicoId String   @unique
  ordemServico   OrdemServico @relation(fields: [ordemServicoId], references: [id], onDelete: Cascade)
  cep            String?
  endereco       String?
  numero         String?
  complemento    String?
  bairro         String?
  cidade         String?
  uf             String?
  totalVolumes   Int
  createdAt      DateTime @default(now())
  volumes        Volume[]
}

model Volume {
  id            String    @id @default(cuid())
  expedicaoId   String
  expedicao     Expedicao @relation(fields: [expedicaoId], references: [id], onDelete: Cascade)
  numero        Int
  codigoInterno String    @unique
  conferido     Boolean   @default(false)
  conferidoEm   DateTime?
}
```

`OrdemServico` (existing model) gains the inverse relation field: `expedicao Expedicao?`.

**Why 1:1 `Expedicao`↔`OrdemServico`, `onDelete: Cascade`:** an OS has at most one *active* expedição at a time. "Regenerating" (changing volume count or address after the fact) means deleting the existing `Expedicao` row — which cascades to delete its `Volume` rows — and creating a fresh `Expedicao` + `Volume` set. This is a deliberate contrast with `OrdemServico`↔`Orcamento`'s `onDelete: Restrict`: an `Orcamento` converted to an OS must never silently lose that link, but an `Expedicao` is disposable/regenerable by design, so cascading is correct here, not a hazard.

**Why address fields live on `Expedicao`, not looked up live from `Cliente` each time:** the operator can edit the shipping address at generation time (a delivery address that differs from the client's registered one). Snapshotting it on `Expedicao` avoids the address silently changing on a re-print if the client's cadastro is edited later — consistent with how `OrcamentoItem.custoCalculado`/`precoFinal` are snapshots, not live recomputations.

**`codigoInterno` format:** `{OS.numero}-{volumeNumero padded to 2 digits}`, e.g. `OS0001-01`, `OS0001-02`. Generated once per `Volume` at creation time by `expedicaoCalculo.ts`'s `gerarCodigoInterno`. Globally unique (enforced by the schema's `@unique`) because `OrdemServico.numero` is already globally unique.

---

## Service Layer

`lib/services/expedicaoCalculo.ts` (pure, no Prisma import — same pattern as `orcamentoCalculo.ts`/`ordemServicoCalculo.ts`):

```ts
export function gerarCodigoInterno(numeroOS: string, volumeNumero: number): string {
  return `${numeroOS}-${String(volumeNumero).padStart(2, "0")}`;
}

export function calcularProgressoConferencia(
  volumes: { conferido: boolean }[]
): { conferidos: number; total: number } {
  return {
    conferidos: volumes.filter((v) => v.conferido).length,
    total: volumes.length,
  };
}
```

`lib/services/expedicaoService.ts`:

- **`gerarExpedicao(ordemServicoId: string, input: ExpedicaoInput): Promise<ExpedicaoComVolumes>`**
  - Loads the OS (`buscarOrdemServico` from `ordemServicoService.ts`) — throws `NotFoundError` if it doesn't exist (propagated from that call).
  - If an `Expedicao` already exists for this `ordemServicoId`, deletes it first (cascades to its `Volume` rows) — this is the "regenerate" path.
  - Creates a new `Expedicao` with the given address fields and `totalVolumes`, plus `totalVolumes` `Volume` rows numbered `1..totalVolumes`, each with `codigoInterno = gerarCodigoInterno(os.numero, numero)`.
  - Runs the delete-then-create as one `prisma.$transaction` so a regenerate is atomic (never left with zero volumes if creation fails partway).

- **`buscarExpedicaoPorOS(ordemServicoId: string): Promise<ExpedicaoComVolumes>`** — throws `NotFoundError` if no `Expedicao` exists for that OS yet.

- **`buscarExpedicao(id: string): Promise<ExpedicaoComVolumes>`** — fetches by the `Expedicao`'s own id (used by the PDF and conferência routes, which are addressed by expedição id once one exists). Throws `NotFoundError` if missing.

- **`conferirVolume(expedicaoId: string, codigoInterno: string): Promise<ExpedicaoComVolumes>`**
  - Finds the `Volume` row matching `codigoInterno` **scoped to this `expedicaoId`** (never a global lookup — a code from a different OS's expedição must not match).
  - Throws `NotFoundError` if no such volume exists in this expedição.
  - Throws `ForbiddenError("Este volume já foi conferido")` if it's already `conferido`.
  - Otherwise updates it to `conferido: true, conferidoEm: now()` and returns the refreshed `ExpedicaoComVolumes`.

`ExpedicaoComVolumes` is a `Prisma.ExpedicaoGetPayload` type with `volumes: true` included, ordered by `numero` ascending.

---

## Permission Model

No `assertAdmin`/`isAdmin` anywhere in this module's own code. Every API route checks only `getSessionRole()` for a non-null session (401 if absent) — identical shape to every Orçamentos/Ordens de Serviço route.

---

## API Routes

```
app/api/ordens-servico/[id]/expedicao/route.ts   — POST (gerar/regenerar), GET (buscar por OS)
app/api/expedicao/[id]/pdf/route.tsx             — GET (PDF de etiquetas, uma página por volume)
app/api/expedicao/[id]/conferir/route.ts         — POST (bipar um volume)
```

`POST /api/ordens-servico/[id]/expedicao` body: `{ totalVolumes: number; cep?: string | null; endereco?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null }`, validated by `expedicaoInputSchema` (Zod). Always returns 201 with the newly created `ExpedicaoComVolumes` — whether this is the first generation for that OS or a regenerate, a fresh `Expedicao` + `Volume` set is created every time this endpoint succeeds.

`POST /api/expedicao/[id]/conferir` body: `{ codigoInterno: string }`, validated by `conferirVolumeInputSchema`.

---

## Components & Pages

```
lib/pdf/etiquetaPdf.tsx                                    — React PDF document: one page per volume
                                                                (~10×15cm page size), showing cliente nome,
                                                                endereço, número da OS, "Volume X de N",
                                                                codigoInterno, and a QR code image (data URI,
                                                                generated via the `qrcode` npm package —
                                                                new dependency) encoding codigoInterno as
                                                                plain text.
components/forms/ExpedicaoForm.tsx                          — totalVolumes + endereço fields (pre-filled
                                                                from orcamento.cliente on first generation,
                                                                pre-filled from the existing Expedicao on
                                                                regenerate), submits to
                                                                POST /api/ordens-servico/[id]/expedicao.
app/(dashboard)/ordens-servico/[id]/OrdemServicoDetalheClient.tsx
                                                              — MODIFIED (existing file from sub-project 3):
                                                                gains an "Expedição" section. No Expedicao
                                                                yet → shows ExpedicaoForm inline under a
                                                                "Gerar Etiquetas" heading. Expedicao exists →
                                                                shows conference progress (via
                                                                calcularProgressoConferencia), a link to the
                                                                PDF, a link to the conferência screen, and a
                                                                "Regenerar Etiquetas" toggle that reveals the
                                                                same ExpedicaoForm pre-filled, with an inline
                                                                warning that regenerating resets conference
                                                                progress.
app/(dashboard)/expedicao/[id]/conferencia/page.tsx          — server component: fetches the Expedicao by id
                                                                (buscarExpedicao), notFound() on missing.
app/(dashboard)/expedicao/[id]/conferencia/ConferenciaClient.tsx
                                                              — client component: auto-focused text input for
                                                                scanning/typing a codigoInterno (Enter submits,
                                                                POSTs to /api/expedicao/[id]/conferir, clears
                                                                input, refreshes the list on success; shows an
                                                                inline error — not a crash — for an unknown or
                                                                already-conferred code), plus the volume list
                                                                (codigoInterno, Pendente/Conferido badge,
                                                                conferidoEm timestamp for conferred ones).
```

**On the Orçamento side:** no changes. Etiquetas are generated from the OS detail page only, per the earlier scope decision (OS→Expedição, not Orçamento→Expedição).

---

## Testing Strategy

- **`expedicaoService.ts`**: tested against the real Prisma test DB — generation (creates the right number of `Volume` rows with correctly formatted, unique `codigoInterno`s), regeneration (old volumes actually gone, conference progress reset to zero, new volumes created), `conferirVolume` (marks the right volume conferido, rejects an unknown code, rejects a code scoped to a different expedição, rejects re-scanning an already-conferred code).
- **`expedicaoCalculo.ts`**: hand-verified pure-function cases — `gerarCodigoInterno` padding for volume numbers 1-9 vs 10+, `calcularProgressoConferencia` with 0/some/all conferred.
- **API routes**: manual verification via `npm run dev`, per the established pattern (thin wrappers, not unit-tested).
- **PDF generation**: manual verification — generate a PDF for a multi-volume expedição, confirm the right page count, confirm the QR code renders and decodes back to the expected `codigoInterno` (can be checked by eye with any QR reader, or by decoding the embedded image data in a quick manual script during implementation).
- **UI**: no new automated component tests beyond what individual implementation tasks judge necessary, consistent with prior sub-projects' leaf-UI-task pattern.

---

## New Dependency

`qrcode` (npm) — generates a QR code as a PNG data URI synchronously in Node, no native/canvas dependency. Used only in `lib/pdf/etiquetaPdf.tsx`.
