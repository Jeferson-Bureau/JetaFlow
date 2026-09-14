# JetaFlow — Orçamentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Orçamentos module — a multi-item quote engine for JETAPRINT's digital and offset printing services, with a calculation engine, CRUD, status workflow (Rascunho → Enviado → Aprovado, plus a derived Expirado), duplicate, PDF export, and WhatsApp send.

**Architecture:** Extends the existing JetaFlow Next.js App Router app (built in sub-project 1, already merged to `master`). Same layering: pure calculation functions in `lib/services/orcamentoCalculo.ts` (unit-tested, no I/O); business logic + DB access in `lib/services/*.ts` (unit-tested against the real Prisma test DB); thin API route wrappers; React form components consuming those routes.

**Tech Stack:** Same as sub-project 1 (Next.js 14 App Router, TypeScript, Prisma/SQLite, Zod, Vitest), plus one new dependency: `@react-pdf/renderer` for server-side PDF generation.

**Spec:** `docs/superpowers/specs/2026-09-14-jetaflow-orcamentos-design.md`

## Global Constraints

- Enumerated values (`Orcamento.status`, `OrcamentoItem.tipo`) are Prisma `String` fields, not Prisma `enum` blocks — validity enforced by Zod at the API boundary and TypeScript union types, same convention as sub-project 1.
- Business logic lives in `lib/services/*.ts`, unit-tested directly against the real Prisma test DB. `orcamentoCalculo.ts` is pure (no Prisma import, no I/O) so it can run both server-side and be imported directly into client components for a live preview.
- API route handlers are thin wrappers (session lookup → service call → `handleApiError`), verified manually via `npm run dev`, not unit-tested — same convention as sub-project 1.
- **Permission model:** any authenticated user (ADMIN or OPERADOR) can create, edit, send, approve, and duplicate quotes — no `assertAdmin` gating anywhere in this module. Every route still requires a session (401 if `getSessionRole()` returns null).
- List search (`listOrcamentos`) filters in JavaScript, not SQL `LIKE` (SQLite connector limitation, same as sub-project 1).
- Money/percentage fields stored as SQLite `Float`.
- `custoCalculado`/`precoFinal` are snapshots computed and stored at save time — never recomputed live from current catalog prices after the fact. The server always recomputes them from submitted inputs before saving; it never trusts a client-submitted price.
- Required relations from `OrcamentoItem`/`Orcamento` to catalog data (`substratoId`, `equipamentoId`, `clienteId`) use `onDelete: Restrict` (a referenced Substrato/Equipamento/Cliente can't be deleted while a quote references it). Optional relations (`chapaId`, `tintaId`) use `onDelete: SetNull`.
- Reuses `handleApiError` (`lib/api-helpers.ts`, already maps `ZodError`→400 and Prisma `P2002`→409 as of sub-project 1's final review) and `Combobox` (`components/ui/Combobox.tsx`) unchanged — no modifications to either in this plan.

---

## File Structure

```
prisma/schema.prisma                      — add Orcamento, OrcamentoItem models + relations
lib/services/numeracaoService.ts          — alocarProximoNumero(tipoDocumento) — role-agnostic
lib/services/orcamentoCalculo.ts          — pure pricing calculation
lib/services/orcamentoService.ts          — CRUD, status transitions, duplicate
lib/validators/orcamento.ts               — Zod schemas
lib/pdf/orcamentoPdf.tsx                  — @react-pdf/renderer document template
app/api/orcamentos/route.ts               — GET (list+search), POST (create)
app/api/orcamentos/[id]/route.ts          — GET, PUT, DELETE
app/api/orcamentos/[id]/enviar/route.ts   — POST
app/api/orcamentos/[id]/aprovar/route.ts  — POST
app/api/orcamentos/[id]/duplicar/route.ts — POST
app/api/orcamentos/[id]/pdf/route.ts      — GET (streams PDF)
components/forms/OrcamentoItemForm.tsx    — one item, with live calculated preview
components/forms/OrcamentoForm.tsx        — cliente + itens list
app/(dashboard)/orcamentos/page.tsx       — list, search, status badges
app/(dashboard)/orcamentos/novo/page.tsx
app/(dashboard)/orcamentos/[id]/page.tsx  — view/edit + actions
tests/**                                  — mirrors lib/ structure
```

---

### Task 1: Prisma schema — Orcamento, OrcamentoItem, and related fields

**Files:**
- Modify: `prisma/schema.prisma`, `tests/setup.ts`
- Test: `tests/lib/services/orcamentoSchema.test.ts`

**Interfaces:**
- Consumes: existing `Cliente`, `Substrato`, `Equipamento`, `ParametroCalculo` models (sub-project 1).
- Produces: `Orcamento`, `OrcamentoItem` Prisma models, `ParametroCalculo.validadePadraoDias` field — consumed by every later task in this plan.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/lib/services/orcamentoSchema.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Orcamento schema", () => {
  it("creates an Orcamento with a nested OrcamentoItem", async () => {
    const cliente = await prisma.cliente.create({
      data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
    });
    const substrato = await prisma.substrato.create({
      data: {
        nome: "Papel Couché", tipo: "PAPEL", unidadeMedida: "m2",
        custoUnitario: 10, atributos: "{}",
      },
    });
    const equipamento = await prisma.equipamento.create({
      data: {
        nome: "Xerox AltaLink", tipo: "DIGITAL", velocidade: 10,
        unidadeVelocidade: "unidades/min", formatoMaximo: "A3",
        custoHora: 120, tempoSetupMin: 15, acabamentosSuportados: "[]",
      },
    });

    const orcamento = await prisma.orcamento.create({
      data: {
        numero: "ORC0001",
        clienteId: cliente.id,
        validadeDias: 15,
        itens: {
          create: [
            {
              descricao: "Cartão de visita",
              tipo: "DIGITAL",
              substratoId: substrato.id,
              larguraCm: 100,
              alturaCm: 50,
              tiragem: 100,
              equipamentoId: equipamento.id,
              acabamentoCusto: 20,
              margemLucro: 25,
              custoCalculado: 1001,
              precoFinal: 1251.25,
              ordem: 0,
            },
          ],
        },
      },
      include: { itens: true },
    });

    expect(orcamento.status).toBe("RASCUNHO");
    expect(orcamento.itens).toHaveLength(1);
    expect(orcamento.itens[0].precoFinal).toBe(1251.25);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run tests/lib/services/orcamentoSchema.test.ts`
Expected: FAIL — `prisma.orcamento` is not a function (model doesn't exist yet).

- [ ] **Step 3: Modify `prisma/schema.prisma`**

Add `orcamentos Orcamento[]` as the last field of the `Cliente` model (just before its closing `}`), so it reads:

```prisma
model Cliente {
  id             String   @id @default(cuid())
  tipo           String
  nome           String
  documento      String   @unique
  ie             String?
  telefone       String?
  email          String?
  cep            String?
  endereco       String?
  numero         String?
  complemento    String?
  bairro         String?
  cidade         String?
  uf             String?
  prazoPagamento Int?
  observacoes    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  orcamentos     Orcamento[]
}
```

Add three named back-relations as the last fields of the `Substrato` model, so it reads:

```prisma
model Substrato {
  id                      String        @id @default(cuid())
  nome                    String
  tipo                    String
  fornecedorId            String?
  fornecedor              Fornecedor?   @relation(fields: [fornecedorId], references: [id])
  unidadeMedida           String
  custoUnitario           Float
  percentualPerda         Float         @default(0)
  markup                  Float         @default(0)
  atributos               String
  ativo                   Boolean       @default(true)
  createdAt               DateTime      @default(now())
  updatedAt               DateTime      @updatedAt
  orcamentoItensPrincipal OrcamentoItem[] @relation("OrcamentoItemSubstratoPrincipal")
  orcamentoItensChapa     OrcamentoItem[] @relation("OrcamentoItemChapa")
  orcamentoItensTinta     OrcamentoItem[] @relation("OrcamentoItemTinta")
}
```

Add one back-relation as the last field of the `Equipamento` model, so it reads:

```prisma
model Equipamento {
  id                    String   @id @default(cuid())
  nome                  String
  tipo                  String
  velocidade            Float
  unidadeVelocidade     String
  formatoMaximo         String
  custoHora             Float
  tempoSetupMin         Int
  percentualPerda       Float    @default(0)
  acabamentosSuportados String
  ativo                 Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  orcamentoItens        OrcamentoItem[]
}
```

Add `validadePadraoDias` as the last field of `ParametroCalculo`, so it reads:

```prisma
model ParametroCalculo {
  id                              Int      @id @default(1)
  margemLucroPadrao               Float    @default(0)
  custoMaoObraHoraPadrao          Float    @default(0)
  percentualCustosIndiretosPadrao Float    @default(0)
  updatedAt                       DateTime @updatedAt
  validadePadraoDias              Int      @default(15)
}
```

Append these two new models at the end of the file:

```prisma
model Orcamento {
  id            String          @id @default(cuid())
  numero        String          @unique
  clienteId     String
  cliente       Cliente         @relation(fields: [clienteId], references: [id], onDelete: Restrict)
  status        String          @default("RASCUNHO")
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
  tipo                String
  substratoId         String
  substrato           Substrato   @relation("OrcamentoItemSubstratoPrincipal", fields: [substratoId], references: [id], onDelete: Restrict)
  larguraCm           Float
  alturaCm            Float
  tiragem             Int
  equipamentoId       String
  equipamento         Equipamento @relation(fields: [equipamentoId], references: [id], onDelete: Restrict)
  chapaId             String?
  chapa               Substrato?  @relation("OrcamentoItemChapa", fields: [chapaId], references: [id], onDelete: SetNull)
  chapaQuantidade     Float?
  tintaId             String?
  tinta               Substrato?  @relation("OrcamentoItemTinta", fields: [tintaId], references: [id], onDelete: SetNull)
  tintaQuantidade     Float?
  acabamentoDescricao String?
  acabamentoCusto     Float       @default(0)
  margemLucro         Float
  custoCalculado      Float
  precoFinal          Float
  ordem               Int
}
```

- [ ] **Step 4: Update `tests/setup.ts`'s table-clearing order**

`Orcamento.clienteId`, `OrcamentoItem.substratoId`, and `OrcamentoItem.equipamentoId` all use `onDelete: Restrict` (Step 3, above). `tests/setup.ts`'s `beforeEach` hook clears tables via raw `DELETE FROM` statements in a fixed order (sub-project 1, Task 2) — with `"Cliente"` cleared before any `Orcamento`/`OrcamentoItem` cleanup exists, a `Restrict`-constrained `Orcamento` row still referencing that `Cliente` would make the `DELETE FROM "Cliente"` fail with a foreign key violation the moment any test creates both in the same file. Fix this by clearing `OrcamentoItem` and `Orcamento` (children first, since `OrcamentoItem.orcamentoId` is `onDelete: Cascade` but explicit ordering is clearer than relying on cascade inside a raw multi-table clear loop) *before* `Cliente`/`Substrato`/`Equipamento` in the array.

Modify `tests/setup.ts`'s `TABLES` array from:

```ts
const TABLES = [
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];
```

to:

```ts
const TABLES = [
  "OrcamentoItem", "Orcamento",
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];
```

- [ ] **Step 5: Regenerate the Prisma client and push the schema**

Run: `npx prisma generate`
Expected: regenerates `node_modules/@prisma/client` types to include `orcamento`/`orcamentoItem`.

Run: `npx prisma db push`
Expected: updates `prisma/dev.db` with the new tables/columns, no data loss on existing tables.

- [ ] **Step 6: Run the test again, verify it passes**

Run: `npx vitest run tests/lib/services/orcamentoSchema.test.ts`
Expected: PASS

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all existing tests still pass (schema changes are additive; nothing from sub-project 1 should break).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma tests/setup.ts tests/lib/services/orcamentoSchema.test.ts
git commit -m "feat: add Orcamento and OrcamentoItem models"
```

---

### Task 2: Calculation engine

**Files:**
- Create: `lib/services/orcamentoCalculo.ts`, `tests/lib/services/orcamentoCalculo.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, no imports from other new modules).
- Produces: `calcularItem(input: ItemCalculoInput): ItemCalculoResultado`, plus the exported interfaces `SubstratoParaCalculo`, `EquipamentoParaCalculo`, `ParametrosParaCalculo`, `ItemCalculoInput`, `ItemCalculoResultado` — consumed by Task 5 (`orcamentoService`) and Task 9 (`OrcamentoItemForm`'s live preview).

**Note on units:** `velocidade` (on `Equipamento`) is assumed to be expressed in "tiragem units per minute" so that `tiragem / velocidade` yields minutes, addable to `tempoSetupMin` (already in minutes). This matches how the design spec's formula is written; it's a convention for whoever fills in `unidadeVelocidade` at data-entry time (sub-project 1), not enforced by a unit-conversion system.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/services/orcamentoCalculo.test.ts
import { describe, it, expect } from "vitest";
import { calcularItem, type ItemCalculoInput } from "@/lib/services/orcamentoCalculo";

const substrato = { custoUnitario: 10, percentualPerda: 10, markup: 50 };
const equipamento = { velocidade: 10, tempoSetupMin: 15, custoHora: 120, percentualPerda: 5 };
const parametros = { custoMaoObraHoraPadrao: 30, percentualCustosIndiretosPadrao: 10 };

const baseInput: ItemCalculoInput = {
  tipo: "DIGITAL",
  substrato,
  larguraCm: 100,
  alturaCm: 50,
  tiragem: 100,
  equipamento,
  chapa: null,
  chapaQuantidade: null,
  tinta: null,
  tintaQuantidade: null,
  acabamentoCusto: 20,
  margemLucro: 25,
  parametros,
};

describe("calcularItem", () => {
  it("calculates a DIGITAL item with no chapa/tinta", () => {
    const resultado = calcularItem(baseInput);
    expect(resultado.custoCalculado).toBeCloseTo(1001, 5);
    expect(resultado.precoFinal).toBeCloseTo(1251.25, 5);
  });

  it("calculates an OFFSET item with chapa and tinta", () => {
    const resultado = calcularItem({
      ...baseInput,
      tipo: "OFFSET",
      chapa: { custoUnitario: 50, percentualPerda: 0, markup: 0 },
      chapaQuantidade: 4,
      tinta: { custoUnitario: 30, percentualPerda: 0, markup: 0 },
      tintaQuantidade: 2,
    });
    expect(resultado.custoCalculado).toBeCloseTo(1287, 5);
    expect(resultado.precoFinal).toBeCloseTo(1608.75, 5);
  });

  it("treats an OFFSET item with no chapa/tinta selected the same as a DIGITAL one", () => {
    const resultado = calcularItem({ ...baseInput, tipo: "OFFSET" });
    expect(resultado.custoCalculado).toBeCloseTo(1001, 5);
    expect(resultado.precoFinal).toBeCloseTo(1251.25, 5);
  });

  it("handles zero acabamentoCusto", () => {
    const resultado = calcularItem({ ...baseInput, acabamentoCusto: 0 });
    expect(resultado.custoCalculado).toBeCloseTo(979, 5);
    expect(resultado.precoFinal).toBeCloseTo(1223.75, 5);
  });

  it("rejects a DIGITAL item with chapa set", () => {
    expect(() =>
      calcularItem({
        ...baseInput,
        chapa: { custoUnitario: 50, percentualPerda: 0, markup: 0 },
        chapaQuantidade: 4,
      })
    ).toThrow("Item DIGITAL não pode ter chapa ou tinta");
  });

  it("rejects zero or negative larguraCm", () => {
    expect(() => calcularItem({ ...baseInput, larguraCm: 0 })).toThrow(
      "Largura, altura e tiragem devem ser maiores que zero"
    );
  });

  it("rejects zero equipamento.velocidade", () => {
    expect(() =>
      calcularItem({ ...baseInput, equipamento: { ...equipamento, velocidade: 0 } })
    ).toThrow("Velocidade do equipamento deve ser maior que zero");
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run tests/lib/services/orcamentoCalculo.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/orcamentoCalculo`.

- [ ] **Step 3: Create `lib/services/orcamentoCalculo.ts`**

```ts
export interface SubstratoParaCalculo {
  custoUnitario: number;
  percentualPerda: number;
  markup: number;
}

export interface EquipamentoParaCalculo {
  velocidade: number;
  tempoSetupMin: number;
  custoHora: number;
  percentualPerda: number;
}

export interface ParametrosParaCalculo {
  custoMaoObraHoraPadrao: number;
  percentualCustosIndiretosPadrao: number;
}

export interface ItemCalculoInput {
  tipo: "DIGITAL" | "OFFSET";
  substrato: SubstratoParaCalculo;
  larguraCm: number;
  alturaCm: number;
  tiragem: number;
  equipamento: EquipamentoParaCalculo;
  chapa?: SubstratoParaCalculo | null;
  chapaQuantidade?: number | null;
  tinta?: SubstratoParaCalculo | null;
  tintaQuantidade?: number | null;
  acabamentoCusto: number;
  margemLucro: number;
  parametros: ParametrosParaCalculo;
}

export interface ItemCalculoResultado {
  custoCalculado: number;
  precoFinal: number;
}

export function calcularItem(input: ItemCalculoInput): ItemCalculoResultado {
  if (input.larguraCm <= 0 || input.alturaCm <= 0 || input.tiragem <= 0) {
    throw new Error("Largura, altura e tiragem devem ser maiores que zero");
  }
  if (input.equipamento.velocidade <= 0) {
    throw new Error("Velocidade do equipamento deve ser maior que zero");
  }
  if (input.tipo === "DIGITAL" && (input.chapa || input.tinta)) {
    throw new Error("Item DIGITAL não pode ter chapa ou tinta");
  }

  const areaM2 = (input.larguraCm / 100) * (input.alturaCm / 100);
  const custoSubstrato =
    areaM2 *
    input.tiragem *
    input.substrato.custoUnitario *
    (1 + input.substrato.percentualPerda / 100) *
    (1 + input.substrato.markup / 100);

  const custoChapa =
    input.tipo === "OFFSET" && input.chapa && input.chapaQuantidade
      ? input.chapaQuantidade * input.chapa.custoUnitario
      : 0;

  const custoTinta =
    input.tipo === "OFFSET" && input.tinta && input.tintaQuantidade
      ? input.tintaQuantidade * input.tinta.custoUnitario
      : 0;

  const tempoMinMaquina =
    input.tiragem / input.equipamento.velocidade + input.equipamento.tempoSetupMin;
  const custoMaquina =
    (tempoMinMaquina / 60) *
    input.equipamento.custoHora *
    (1 + input.equipamento.percentualPerda / 100);

  const custoAcabamento = input.acabamentoCusto;

  const custoMaoObra = (tempoMinMaquina / 60) * input.parametros.custoMaoObraHoraPadrao;

  const subtotalAntesIndireto =
    custoSubstrato + custoChapa + custoTinta + custoMaquina + custoAcabamento + custoMaoObra;
  const custoIndireto =
    subtotalAntesIndireto * (input.parametros.percentualCustosIndiretosPadrao / 100);

  const custoCalculado = subtotalAntesIndireto + custoIndireto;
  const precoFinal = custoCalculado * (1 + input.margemLucro / 100);

  return { custoCalculado, precoFinal };
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/orcamentoCalculo.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: Commit**

```bash
git add lib/services/orcamentoCalculo.ts tests/lib/services/orcamentoCalculo.test.ts
git commit -m "feat: add orcamento pricing calculation engine"
```

---

### Task 3: Validators

**Files:**
- Create: `lib/validators/orcamento.ts`, `tests/lib/validators/orcamento.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `orcamentoInputSchema`, `orcamentoItemInputSchema` (Zod schemas), `OrcamentoInput`, `OrcamentoItemInput` (types) — consumed by Task 5 (`orcamentoService`) and Task 7 (API routes).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/validators/orcamento.test.ts
import { describe, it, expect } from "vitest";
import { orcamentoInputSchema, orcamentoItemInputSchema } from "@/lib/validators/orcamento";

const validItem = {
  descricao: "Cartão de visita",
  tipo: "DIGITAL" as const,
  substratoId: "sub1",
  larguraCm: 100,
  alturaCm: 50,
  tiragem: 100,
  equipamentoId: "equip1",
  acabamentoCusto: 20,
  margemLucro: 25,
};

describe("orcamentoItemInputSchema", () => {
  it("accepts a valid DIGITAL item", () => {
    expect(orcamentoItemInputSchema.safeParse(validItem).success).toBe(true);
  });

  it("accepts a valid OFFSET item with chapa/tinta", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: "chapa1",
      chapaQuantidade: 4,
      tintaId: "tinta1",
      tintaQuantidade: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a DIGITAL item with chapaId set", () => {
    const result = orcamentoItemInputSchema.safeParse({ ...validItem, chapaId: "chapa1" });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive tiragem", () => {
    const result = orcamentoItemInputSchema.safeParse({ ...validItem, tiragem: 0 });
    expect(result.success).toBe(false);
  });
});

describe("orcamentoInputSchema", () => {
  it("accepts a valid orcamento with one item", () => {
    const result = orcamentoInputSchema.safeParse({ clienteId: "cli1", itens: [validItem] });
    expect(result.success).toBe(true);
  });

  it("rejects an orcamento with zero items", () => {
    const result = orcamentoInputSchema.safeParse({ clienteId: "cli1", itens: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a missing clienteId", () => {
    const result = orcamentoInputSchema.safeParse({ itens: [validItem] });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run tests/lib/validators/orcamento.test.ts`
Expected: FAIL — cannot resolve `@/lib/validators/orcamento`.

- [ ] **Step 3: Create `lib/validators/orcamento.ts`**

```ts
import { z } from "zod";

export const orcamentoItemInputSchema = z
  .object({
    descricao: z.string().min(1, "Descrição obrigatória"),
    tipo: z.enum(["DIGITAL", "OFFSET"]),
    substratoId: z.string().min(1, "Substrato obrigatório"),
    larguraCm: z.number().positive("Largura deve ser maior que zero"),
    alturaCm: z.number().positive("Altura deve ser maior que zero"),
    tiragem: z.number().int().positive("Tiragem deve ser maior que zero"),
    equipamentoId: z.string().min(1, "Equipamento obrigatório"),
    chapaId: z.string().nullable().optional(),
    chapaQuantidade: z.number().positive().nullable().optional(),
    tintaId: z.string().nullable().optional(),
    tintaQuantidade: z.number().positive().nullable().optional(),
    acabamentoDescricao: z.string().nullable().optional(),
    acabamentoCusto: z.number().min(0).default(0),
    margemLucro: z.number().min(0),
  })
  .refine((item) => item.tipo === "OFFSET" || (!item.chapaId && !item.tintaId), {
    message: "Chapa e tinta só podem ser usadas em itens OFFSET",
    path: ["chapaId"],
  });

export const orcamentoInputSchema = z.object({
  clienteId: z.string().min(1, "Cliente obrigatório"),
  observacoes: z.string().nullable().optional(),
  itens: z.array(orcamentoItemInputSchema).min(1, "Orçamento precisa de ao menos um item"),
});

export type OrcamentoItemInput = z.infer<typeof orcamentoItemInputSchema>;
export type OrcamentoInput = z.infer<typeof orcamentoInputSchema>;
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/validators/orcamento.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: Commit**

```bash
git add lib/validators/orcamento.ts tests/lib/validators/orcamento.test.ts
git commit -m "feat: add orcamento Zod validators"
```

---

### Task 4: Document numbering helper

**Files:**
- Create: `lib/services/numeracaoService.ts`, `tests/lib/services/numeracaoService.test.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`, the existing `NumeracaoDocumento` model (sub-project 1, seeded with a `tipoDocumento: "ORCAMENTO"` row by Task 11 of sub-project 1's plan).
- Produces: `alocarProximoNumero(tipoDocumento: string): Promise<string>` — consumed by Task 5 (`orcamentoService`'s `criarOrcamento`/`duplicarOrcamento`).

**Why a new file instead of reusing `configuracaoService.ts`'s `listNumeracoes`/`updateNumeracao`:** those two functions (sub-project 1, Task 11) are `assertAdmin`-gated, because viewing/editing numbering *configuration* (prefix, reset the counter) is an ADMIN-only Configurações concern. Allocating the *next number* when a document is created is a different, role-agnostic operation — any authenticated user creating an Orçamento needs it, and it has no admin implications (it only atomically increments a counter). Keeping it in its own small file avoids threading a fake "role" through `configuracaoService` just to bypass its own admin gate.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/services/numeracaoService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";

describe("alocarProximoNumero", () => {
  beforeEach(async () => {
    await prisma.numeracaoDocumento.upsert({
      where: { tipoDocumento: "ORCAMENTO" },
      update: { prefixo: "ORC", proximoNumero: 1, digitos: 4 },
      create: { tipoDocumento: "ORCAMENTO", prefixo: "ORC", proximoNumero: 1, digitos: 4 },
    });
  });

  it("allocates the current number and increments the counter", async () => {
    const primeiro = await alocarProximoNumero("ORCAMENTO");
    expect(primeiro).toBe("ORC0001");

    const segundo = await alocarProximoNumero("ORCAMENTO");
    expect(segundo).toBe("ORC0002");
  });

  it("pads the number to the configured number of digits", async () => {
    await prisma.numeracaoDocumento.update({
      where: { tipoDocumento: "ORCAMENTO" },
      data: { proximoNumero: 99, digitos: 3 },
    });
    const numero = await alocarProximoNumero("ORCAMENTO");
    expect(numero).toBe("ORC099");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run tests/lib/services/numeracaoService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/numeracaoService`.

- [ ] **Step 3: Create `lib/services/numeracaoService.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function alocarProximoNumero(tipoDocumento: string): Promise<string> {
  const numeracao = await prisma.numeracaoDocumento.update({
    where: { tipoDocumento },
    data: { proximoNumero: { increment: 1 } },
  });
  const numeroAlocado = numeracao.proximoNumero - 1;
  return `${numeracao.prefixo}${String(numeroAlocado).padStart(numeracao.digitos, "0")}`;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run tests/lib/services/numeracaoService.test.ts`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add lib/services/numeracaoService.ts tests/lib/services/numeracaoService.test.ts
git commit -m "feat: add role-agnostic document numbering allocator"
```

---

### Task 5: Orçamento service — create, read, update

**Files:**
- Create: `lib/services/orcamentoService.ts`, `tests/lib/services/orcamentoService.test.ts`

**Interfaces:**
- Consumes: `prisma`, `calcularItem`/`ItemCalculoInput` from `lib/services/orcamentoCalculo.ts`, `alocarProximoNumero` from `lib/services/numeracaoService.ts`, `orcamentoInputSchema`/`OrcamentoInput` from `lib/validators/orcamento.ts`, `NotFoundError`/`ForbiddenError` from `lib/errors.ts`.
- Produces: `criarOrcamento(input: OrcamentoInput)`, `listarOrcamentos(search?: string)`, `buscarOrcamento(id: string)`, `atualizarOrcamento(id: string, input: OrcamentoInput)` — consumed by Task 7 (API routes) and Task 6 (this task's sibling, status transitions, which reuses `buscarOrcamento`'s row-loading shape).
- Produces the shared type `OrcamentoComItens` (an Orcamento with its `itens` and `cliente` included) — consumed by Task 6, Task 7, and the PDF template in Task 11.

**Design notes:**
- `criarOrcamento` and `atualizarOrcamento` both recompute every item's `custoCalculado`/`precoFinal` server-side via `calcularItem`, using freshly-loaded `Substrato`/`Equipamento`/`ParametroCalculo` rows — never trusting a client-submitted price.
- `atualizarOrcamento` throws `ForbiddenError` if the orçamento's current status is `APROVADO` (locked).
- `listarOrcamentos` fetches all rows (with `cliente` included for its `nome`) and filters in JS by `cliente.nome` or `numero`, matching sub-project 1's JS-search convention.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/services/orcamentoService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarOrcamento,
  listarOrcamentos,
  buscarOrcamento,
  atualizarOrcamento,
} from "@/lib/services/orcamentoService";

async function seedCatalogo() {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento: "ORCAMENTO" },
    update: { prefixo: "ORC", proximoNumero: 1, digitos: 4 },
    create: { tipoDocumento: "ORCAMENTO", prefixo: "ORC", proximoNumero: 1, digitos: 4 },
  });
  await prisma.parametroCalculo.upsert({
    where: { id: 1 },
    update: { margemLucroPadrao: 25, custoMaoObraHoraPadrao: 30, percentualCustosIndiretosPadrao: 10 },
    create: {
      id: 1, margemLucroPadrao: 25, custoMaoObraHoraPadrao: 30,
      percentualCustosIndiretosPadrao: 10, validadePadraoDias: 15,
    },
  });
  const cliente = await prisma.cliente.create({
    data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
  });
  const substrato = await prisma.substrato.create({
    data: { nome: "Papel Couché", tipo: "PAPEL", unidadeMedida: "m2", custoUnitario: 10, percentualPerda: 10, markup: 50, atributos: "{}" },
  });
  const equipamento = await prisma.equipamento.create({
    data: { nome: "Xerox AltaLink", tipo: "DIGITAL", velocidade: 10, unidadeVelocidade: "unidades/min", formatoMaximo: "A3", custoHora: 120, tempoSetupMin: 15, percentualPerda: 5, acabamentosSuportados: "[]" },
  });
  return { cliente, substrato, equipamento };
}

describe("orcamentoService", () => {
  let seed: Awaited<ReturnType<typeof seedCatalogo>>;

  beforeEach(async () => {
    seed = await seedCatalogo();
  });

  it("creates an orcamento with a computed price and an allocated numero", async () => {
    const orcamento = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [
        {
          descricao: "Cartão de visita",
          tipo: "DIGITAL",
          substratoId: seed.substrato.id,
          larguraCm: 100,
          alturaCm: 50,
          tiragem: 100,
          equipamentoId: seed.equipamento.id,
          acabamentoCusto: 20,
          margemLucro: 25,
        },
      ],
    });

    expect(orcamento.numero).toBe("ORC0001");
    expect(orcamento.status).toBe("RASCUNHO");
    expect(orcamento.validadeDias).toBe(15);
    expect(orcamento.itens[0].precoFinal).toBeCloseTo(1251.25, 5);
  });

  it("lists and searches by cliente nome", async () => {
    await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    const resultados = await listarOrcamentos("Cliente Teste");
    expect(resultados).toHaveLength(1);
    const vazio = await listarOrcamentos("Nome Que Não Existe");
    expect(vazio).toHaveLength(0);
  });

  it("throws NotFoundError for a missing orcamento", async () => {
    await expect(buscarOrcamento("id-inexistente")).rejects.toThrow("Não encontrado");
  });

  it("updates an orcamento's itens, recomputing prices server-side", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id, acabamentoCusto: 20, margemLucro: 25 }],
    });

    const atualizado = await atualizarOrcamento(criado.id, {
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item editado", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 25 }],
    });

    expect(atualizado.itens[0].descricao).toBe("Item editado");
    expect(atualizado.itens[0].precoFinal).toBeCloseTo(1223.75, 5);
  });

  it("rejects updating an APROVADO orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    await prisma.orcamento.update({ where: { id: criado.id }, data: { status: "APROVADO" } });

    await expect(
      atualizarOrcamento(criado.id, { clienteId: seed.cliente.id, itens: criado.itens })
    ).rejects.toThrow("Acesso negado");
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run tests/lib/services/orcamentoService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/orcamentoService`.

- [ ] **Step 3: Create `lib/services/orcamentoService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";
import { calcularItem, type ItemCalculoInput } from "@/lib/services/orcamentoCalculo";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

const INCLUDE_ITENS_E_CLIENTE = {
  itens: true,
  cliente: true,
} satisfies Prisma.OrcamentoInclude;

export type OrcamentoComItens = Prisma.OrcamentoGetPayload<{
  include: typeof INCLUDE_ITENS_E_CLIENTE;
}>;

async function carregarParametros() {
  return prisma.parametroCalculo.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

async function calcularItens(itens: OrcamentoInput["itens"]) {
  const parametros = await carregarParametros();

  return Promise.all(
    itens.map(async (item, ordem) => {
      const substrato = await prisma.substrato.findUniqueOrThrow({ where: { id: item.substratoId } });
      const equipamento = await prisma.equipamento.findUniqueOrThrow({ where: { id: item.equipamentoId } });
      const chapa = item.chapaId
        ? await prisma.substrato.findUniqueOrThrow({ where: { id: item.chapaId } })
        : null;
      const tinta = item.tintaId
        ? await prisma.substrato.findUniqueOrThrow({ where: { id: item.tintaId } })
        : null;

      const calculoInput: ItemCalculoInput = {
        tipo: item.tipo,
        substrato,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        tiragem: item.tiragem,
        equipamento,
        chapa,
        chapaQuantidade: item.chapaQuantidade ?? null,
        tinta,
        tintaQuantidade: item.tintaQuantidade ?? null,
        acabamentoCusto: item.acabamentoCusto,
        margemLucro: item.margemLucro,
        parametros,
      };
      const { custoCalculado, precoFinal } = calcularItem(calculoInput);

      return {
        descricao: item.descricao,
        tipo: item.tipo,
        substratoId: item.substratoId,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        tiragem: item.tiragem,
        equipamentoId: item.equipamentoId,
        chapaId: item.chapaId ?? null,
        chapaQuantidade: item.chapaQuantidade ?? null,
        tintaId: item.tintaId ?? null,
        tintaQuantidade: item.tintaQuantidade ?? null,
        acabamentoDescricao: item.acabamentoDescricao ?? null,
        acabamentoCusto: item.acabamentoCusto,
        margemLucro: item.margemLucro,
        custoCalculado,
        precoFinal,
        ordem,
      };
    })
  );
}

export async function criarOrcamento(input: OrcamentoInput): Promise<OrcamentoComItens> {
  const [numero, itensCalculados, parametros] = await Promise.all([
    alocarProximoNumero("ORCAMENTO"),
    calcularItens(input.itens),
    carregarParametros(),
  ]);

  return prisma.orcamento.create({
    data: {
      numero,
      clienteId: input.clienteId,
      observacoes: input.observacoes ?? null,
      validadeDias: parametros.validadePadraoDias,
      itens: { create: itensCalculados },
    },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function listarOrcamentos(search?: string): Promise<OrcamentoComItens[]> {
  const todos = await prisma.orcamento.findMany({
    include: INCLUDE_ITENS_E_CLIENTE,
    orderBy: { createdAt: "desc" },
  });
  if (!search) return todos;
  const termo = search.toLowerCase();
  return todos.filter(
    (o) => o.numero.toLowerCase().includes(termo) || o.cliente.nome.toLowerCase().includes(termo)
  );
}

export async function buscarOrcamento(id: string): Promise<OrcamentoComItens> {
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
  if (!orcamento) throw new NotFoundError();
  return orcamento;
}

export async function atualizarOrcamento(id: string, input: OrcamentoInput): Promise<OrcamentoComItens> {
  const existente = await buscarOrcamento(id);
  if (existente.status === "APROVADO") {
    throw new ForbiddenError("Orçamento aprovado não pode ser editado");
  }

  const itensCalculados = await calcularItens(input.itens);

  return prisma.$transaction(async (tx) => {
    await tx.orcamentoItem.deleteMany({ where: { orcamentoId: id } });
    return tx.orcamento.update({
      where: { id },
      data: {
        clienteId: input.clienteId,
        observacoes: input.observacoes ?? null,
        itens: { create: itensCalculados },
      },
      include: INCLUDE_ITENS_E_CLIENTE,
    });
  });
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/orcamentoService.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/services/orcamentoService.ts tests/lib/services/orcamentoService.test.ts
git commit -m "feat: add orcamento create/read/update service"
```

---

### Task 6: Orçamento service — status transitions and duplicate

**Files:**
- Modify: `lib/services/orcamentoService.ts`
- Modify: `tests/lib/services/orcamentoService.test.ts`

**Interfaces:**
- Consumes: everything from Task 5 (same file), `alocarProximoNumero`.
- Produces: `enviarOrcamento(id: string)`, `aprovarOrcamento(id: string)`, `duplicarOrcamento(id: string)` — consumed by Task 8 (action routes). `estaExpirado(orcamento: OrcamentoComItens): boolean` — used internally by `aprovarOrcamento` (this file) and unit-tested directly; **not** imported by Task 10's list page, since that page is a client component and this file imports `prisma` (server-only) — Task 10 reimplements the same date-comparison logic locally instead (see that task's design notes).

**Design notes:**
- `enviarOrcamento` only succeeds from `RASCUNHO`; sets `dataEnvio`.
- `aprovarOrcamento` only succeeds from `ENVIADO`, and only if not expired (`estaExpirado` returns false); sets `dataAprovacao`.
- `estaExpirado` is a pure function of the loaded row (no DB write) — `status !== "APROVADO" && createdAt + validadeDias < now`.
- `duplicarOrcamento` clones `cliente` + all `itens` (dropping `id`s) into a new `RASCUNHO` with a freshly-allocated `numero`.

- [ ] **Step 1: Add the failing tests** (append to `tests/lib/services/orcamentoService.test.ts`, inside the existing `describe("orcamentoService", ...)` block, after the last `it(...)`)

```ts
  it("sends an orcamento, moving RASCUNHO to ENVIADO", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    const enviado = await enviarOrcamento(criado.id);
    expect(enviado.status).toBe("ENVIADO");
    expect(enviado.dataEnvio).not.toBeNull();
  });

  it("rejects approving a RASCUNHO orcamento (must be sent first)", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    await expect(aprovarOrcamento(criado.id)).rejects.toThrow("Acesso negado");
  });

  it("approves a sent orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    const aprovado = await aprovarOrcamento(criado.id);
    expect(aprovado.status).toBe("APROVADO");
    expect(aprovado.dataAprovacao).not.toBeNull();
  });

  it("rejects approving an expired orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    await prisma.orcamento.update({
      where: { id: criado.id },
      data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), validadeDias: 15 },
    });
    await expect(aprovarOrcamento(criado.id)).rejects.toThrow("expirado");
  });

  it("duplicates an orcamento into a fresh RASCUNHO with a new numero", async () => {
    const original = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item original", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    await enviarOrcamento(original.id);

    const copia = await duplicarOrcamento(original.id);
    expect(copia.id).not.toBe(original.id);
    expect(copia.numero).not.toBe(original.numero);
    expect(copia.status).toBe("RASCUNHO");
    expect(copia.dataEnvio).toBeNull();
    expect(copia.itens).toHaveLength(1);
    expect(copia.itens[0].descricao).toBe("Item original");
    expect(copia.itens[0].id).not.toBe(original.itens[0].id);
  });

  it("estaExpirado is false for an APROVADO orcamento even past validadeDias", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    const aprovado = await aprovarOrcamento(criado.id);
    await prisma.orcamento.update({
      where: { id: criado.id },
      data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const recarregado = await buscarOrcamento(criado.id);
    expect(estaExpirado(recarregado)).toBe(false);
    expect(recarregado.status).toBe("APROVADO");
  });
```

Also update the test file's import line to include the new functions:

```ts
import {
  criarOrcamento,
  listarOrcamentos,
  buscarOrcamento,
  atualizarOrcamento,
  enviarOrcamento,
  aprovarOrcamento,
  duplicarOrcamento,
  estaExpirado,
} from "@/lib/services/orcamentoService";
```

- [ ] **Step 2: Run the tests, verify the new ones fail**

Run: `npx vitest run tests/lib/services/orcamentoService.test.ts`
Expected: FAIL — `enviarOrcamento`/`aprovarOrcamento`/`duplicarOrcamento`/`estaExpirado` are not exported.

- [ ] **Step 3: Append to `lib/services/orcamentoService.ts`**

```ts
export function estaExpirado(orcamento: OrcamentoComItens): boolean {
  if (orcamento.status === "APROVADO") return false;
  const limite = new Date(orcamento.createdAt);
  limite.setDate(limite.getDate() + orcamento.validadeDias);
  return limite < new Date();
}

export async function enviarOrcamento(id: string): Promise<OrcamentoComItens> {
  const existente = await buscarOrcamento(id);
  if (existente.status !== "RASCUNHO") {
    throw new ForbiddenError("Só é possível enviar um orçamento em rascunho");
  }
  return prisma.orcamento.update({
    where: { id },
    data: { status: "ENVIADO", dataEnvio: new Date() },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function aprovarOrcamento(id: string): Promise<OrcamentoComItens> {
  const existente = await buscarOrcamento(id);
  if (existente.status !== "ENVIADO") {
    throw new ForbiddenError("Só é possível aprovar um orçamento enviado");
  }
  if (estaExpirado(existente)) {
    throw new ForbiddenError("Orçamento expirado não pode ser aprovado");
  }
  return prisma.orcamento.update({
    where: { id },
    data: { status: "APROVADO", dataAprovacao: new Date() },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function duplicarOrcamento(id: string): Promise<OrcamentoComItens> {
  const original = await buscarOrcamento(id);
  const numero = await alocarProximoNumero("ORCAMENTO");

  return prisma.orcamento.create({
    data: {
      numero,
      clienteId: original.clienteId,
      observacoes: original.observacoes,
      validadeDias: original.validadeDias,
      itens: {
        create: original.itens
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => ({
            descricao: item.descricao,
            tipo: item.tipo,
            substratoId: item.substratoId,
            larguraCm: item.larguraCm,
            alturaCm: item.alturaCm,
            tiragem: item.tiragem,
            equipamentoId: item.equipamentoId,
            chapaId: item.chapaId,
            chapaQuantidade: item.chapaQuantidade,
            tintaId: item.tintaId,
            tintaQuantidade: item.tintaQuantidade,
            acabamentoDescricao: item.acabamentoDescricao,
            acabamentoCusto: item.acabamentoCusto,
            margemLucro: item.margemLucro,
            custoCalculado: item.custoCalculado,
            precoFinal: item.precoFinal,
            ordem: item.ordem,
          })),
      },
    },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}
```

Note: `ForbiddenError`'s constructor takes a custom message (see `lib/errors.ts` from sub-project 1 — `constructor(message = "Acesso negado")`), so `"Orçamento expirado não pode ser aprovado"` is a valid custom message; the test asserting `.rejects.toThrow("expirado")` matches this message by substring.

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/orcamentoService.test.ts`
Expected: PASS (11/11)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/services/orcamentoService.ts tests/lib/services/orcamentoService.test.ts
git commit -m "feat: add orcamento status transitions and duplicate"
```

---

### Task 7: API routes — CRUD

**Files:**
- Create: `app/api/orcamentos/route.ts`, `app/api/orcamentos/[id]/route.ts`

**Interfaces:**
- Consumes: `getSessionRole` from `lib/permissions.ts`, `handleApiError` from `lib/api-helpers.ts`, `orcamentoInputSchema` from `lib/validators/orcamento.ts`, `criarOrcamento`/`listarOrcamentos`/`buscarOrcamento`/`atualizarOrcamento` from `lib/services/orcamentoService.ts`, `prisma` (for `DELETE` only).
- Produces: the `/api/orcamentos` and `/api/orcamentos/[id]` HTTP surface — consumed by Task 10 (UI pages).

- [ ] **Step 1: Create `app/api/orcamentos/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { orcamentoInputSchema } from "@/lib/validators/orcamento";
import { criarOrcamento, listarOrcamentos } from "@/lib/services/orcamentoService";

export async function GET(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const orcamentos = await listarOrcamentos(search);
    return NextResponse.json(orcamentos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const input = orcamentoInputSchema.parse(await request.json());
    const orcamento = await criarOrcamento(input);
    return NextResponse.json(orcamento, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Create `app/api/orcamentos/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { orcamentoInputSchema } from "@/lib/validators/orcamento";
import { buscarOrcamento, atualizarOrcamento } from "@/lib/services/orcamentoService";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await buscarOrcamento(params.id);
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const input = orcamentoInputSchema.parse(await request.json());
    const orcamento = await atualizarOrcamento(params.id, input);
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    await prisma.orcamento.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, log in, then in another terminal:

```bash
curl -s -b cookies.txt http://localhost:3000/api/orcamentos
```

Expected: `[]` (or existing orçamentos) with a 200 status, once authenticated (login via the existing `/login` flow first to populate `cookies.txt`, same as manual verification in sub-project 1's tasks).

- [ ] **Step 4: Commit**

```bash
git add app/api/orcamentos/route.ts "app/api/orcamentos/[id]/route.ts"
git commit -m "feat: add orcamento CRUD API routes"
```

---

### Task 8: API routes — enviar, aprovar, duplicar

**Files:**
- Create: `app/api/orcamentos/[id]/enviar/route.ts`, `app/api/orcamentos/[id]/aprovar/route.ts`, `app/api/orcamentos/[id]/duplicar/route.ts`

**Interfaces:**
- Consumes: `getSessionRole`, `handleApiError`, `enviarOrcamento`/`aprovarOrcamento`/`duplicarOrcamento` from `lib/services/orcamentoService.ts`.
- Produces: the three action endpoints — consumed by Task 12 (action buttons wired into the detail page).

- [ ] **Step 1: Create `app/api/orcamentos/[id]/enviar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { enviarOrcamento } from "@/lib/services/orcamentoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await enviarOrcamento(params.id);
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Create `app/api/orcamentos/[id]/aprovar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { aprovarOrcamento } from "@/lib/services/orcamentoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await aprovarOrcamento(params.id);
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 3: Create `app/api/orcamentos/[id]/duplicar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { duplicarOrcamento } from "@/lib/services/orcamentoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const copia = await duplicarOrcamento(params.id);
    return NextResponse.json(copia, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, create an orçamento via the API (or wait for Task 10's UI), then:

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/orcamentos/<id>/enviar
curl -s -b cookies.txt -X POST http://localhost:3000/api/orcamentos/<id>/aprovar
```

Expected: first call returns the orçamento with `status: "ENVIADO"`; second returns `status: "APROVADO"`.

- [ ] **Step 5: Commit**

```bash
git add "app/api/orcamentos/[id]/enviar" "app/api/orcamentos/[id]/aprovar" "app/api/orcamentos/[id]/duplicar"
git commit -m "feat: add orcamento status-transition and duplicate API routes"
```

---

### Task 9: OrcamentoItemForm component

**Files:**
- Create: `components/forms/OrcamentoItemForm.tsx`

**Interfaces:**
- Consumes: `Combobox` from `components/ui/Combobox.tsx`, `calcularItem`/`ItemCalculoInput` from `lib/services/orcamentoCalculo.ts` (for the live preview — a pure function, safe to import into a client component).
- Produces: `OrcamentoItemForm` component with props `{ value, onChange, onRemove, substratos, equipamentos, parametros }` — consumed by Task 10's `OrcamentoForm`.

**Design notes:** this component receives the full `Substrato[]`/`Equipamento[]` catalogs and the current `ParametroCalculo` as props (fetched once by the parent `OrcamentoForm`, not re-fetched per item), so it can call `calcularItem` locally on every keystroke for a live preview without a network round-trip. The `chapa`/`tinta` Comboboxes only render when `tipo === "OFFSET"`.

- [ ] **Step 1: Create `components/forms/OrcamentoItemForm.tsx`**

```tsx
"use client";

import Combobox from "@/components/ui/Combobox";
import { calcularItem, type ItemCalculoInput } from "@/lib/services/orcamentoCalculo";

export interface OrcamentoItemValues {
  descricao: string;
  tipo: "DIGITAL" | "OFFSET";
  substratoId: string;
  larguraCm: number;
  alturaCm: number;
  tiragem: number;
  equipamentoId: string;
  chapaId: string | null;
  chapaQuantidade: number | null;
  tintaId: string | null;
  tintaQuantidade: number | null;
  acabamentoDescricao: string;
  acabamentoCusto: number;
  margemLucro: number;
}

interface SubstratoOpcao {
  id: string;
  nome: string;
  custoUnitario: number;
  percentualPerda: number;
  markup: number;
}

interface EquipamentoOpcao {
  id: string;
  nome: string;
  velocidade: number;
  tempoSetupMin: number;
  custoHora: number;
  percentualPerda: number;
}

interface OrcamentoItemFormProps {
  value: OrcamentoItemValues;
  onChange: (value: OrcamentoItemValues) => void;
  onRemove: () => void;
  substratos: SubstratoOpcao[];
  equipamentos: EquipamentoOpcao[];
  parametros: { custoMaoObraHoraPadrao: number; percentualCustosIndiretosPadrao: number };
}

function calcularPreview(
  value: OrcamentoItemValues,
  substratos: SubstratoOpcao[],
  equipamentos: EquipamentoOpcao[],
  parametros: OrcamentoItemFormProps["parametros"]
): { custoCalculado: number; precoFinal: number } | null {
  const substrato = substratos.find((s) => s.id === value.substratoId);
  const equipamento = equipamentos.find((e) => e.id === value.equipamentoId);
  if (!substrato || !equipamento || value.larguraCm <= 0 || value.alturaCm <= 0 || value.tiragem <= 0) {
    return null;
  }
  const chapa = value.chapaId ? substratos.find((s) => s.id === value.chapaId) ?? null : null;
  const tinta = value.tintaId ? substratos.find((s) => s.id === value.tintaId) ?? null : null;

  const input: ItemCalculoInput = {
    tipo: value.tipo,
    substrato,
    larguraCm: value.larguraCm,
    alturaCm: value.alturaCm,
    tiragem: value.tiragem,
    equipamento,
    chapa,
    chapaQuantidade: value.chapaQuantidade,
    tinta,
    tintaQuantidade: value.tintaQuantidade,
    acabamentoCusto: value.acabamentoCusto,
    margemLucro: value.margemLucro,
    parametros,
  };

  try {
    return calcularItem(input);
  } catch {
    return null;
  }
}

export default function OrcamentoItemForm({
  value,
  onChange,
  onRemove,
  substratos,
  equipamentos,
  parametros,
}: OrcamentoItemFormProps) {
  const preview = calcularPreview(value, substratos, equipamentos, parametros);

  function set<K extends keyof OrcamentoItemValues>(key: K, val: OrcamentoItemValues[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Descrição"
          value={value.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="button" onClick={onRemove} className="ml-3 text-sm text-rosa">
          Remover
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={value.tipo}
          onChange={(e) => {
            const tipo = e.target.value as "DIGITAL" | "OFFSET";
            onChange({
              ...value,
              tipo,
              chapaId: tipo === "DIGITAL" ? null : value.chapaId,
              chapaQuantidade: tipo === "DIGITAL" ? null : value.chapaQuantidade,
              tintaId: tipo === "DIGITAL" ? null : value.tintaId,
              tintaQuantidade: tipo === "DIGITAL" ? null : value.tintaQuantidade,
            });
          }}
          className="rounded border px-3 py-2"
        >
          <option value="DIGITAL">Digital</option>
          <option value="OFFSET">Offset</option>
        </select>

        <Combobox
          items={substratos}
          value={substratos.find((s) => s.id === value.substratoId) ?? null}
          onChange={(s) => set("substratoId", s.id)}
          getLabel={(s) => s.nome}
          placeholder="Substrato"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          placeholder="Largura (cm)"
          value={value.larguraCm || ""}
          onChange={(e) => set("larguraCm", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Altura (cm)"
          value={value.alturaCm || ""}
          onChange={(e) => set("alturaCm", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Tiragem"
          value={value.tiragem || ""}
          onChange={(e) => set("tiragem", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
      </div>

      <Combobox
        items={equipamentos}
        value={equipamentos.find((e) => e.id === value.equipamentoId) ?? null}
        onChange={(e) => set("equipamentoId", e.id)}
        getLabel={(e) => e.nome}
        placeholder="Equipamento"
      />

      {value.tipo === "OFFSET" && (
        <div className="grid grid-cols-2 gap-3 rounded border border-dashed p-3">
          <div className="space-y-2">
            <Combobox
              items={substratos}
              value={substratos.find((s) => s.id === value.chapaId) ?? null}
              onChange={(s) => set("chapaId", s.id)}
              getLabel={(s) => s.nome}
              placeholder="Chapa"
            />
            <input
              type="number"
              placeholder="Qtd. chapas (cores)"
              value={value.chapaQuantidade ?? ""}
              onChange={(e) => set("chapaQuantidade", Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="space-y-2">
            <Combobox
              items={substratos}
              value={substratos.find((s) => s.id === value.tintaId) ?? null}
              onChange={(s) => set("tintaId", s.id)}
              getLabel={(s) => s.nome}
              placeholder="Tinta"
            />
            <input
              type="number"
              placeholder="Qtd. tinta"
              value={value.tintaQuantidade ?? ""}
              onChange={(e) => set("tintaQuantidade", Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Acabamento"
          value={value.acabamentoDescricao}
          onChange={(e) => set("acabamentoDescricao", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Custo do acabamento"
          value={value.acabamentoCusto || ""}
          onChange={(e) => set("acabamentoCusto", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Margem de lucro (%)"
          value={value.margemLucro || ""}
          onChange={(e) => set("margemLucro", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
      </div>

      <div className="text-right text-sm">
        {preview ? (
          <>
            <span className="text-gray-500">Custo: R$ {preview.custoCalculado.toFixed(2)} — </span>
            <span className="font-semibold text-ciano">Preço: R$ {preview.precoFinal.toFixed(2)}</span>
          </>
        ) : (
          <span className="text-gray-400">Preencha os campos para ver o cálculo</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/forms/OrcamentoItemForm.tsx
git commit -m "feat: add OrcamentoItemForm with live price preview"
```

---

### Task 10: OrcamentoForm, list, and create/edit pages

**Files:**
- Create: `components/forms/OrcamentoForm.tsx`, `app/(dashboard)/orcamentos/page.tsx`, `app/(dashboard)/orcamentos/novo/page.tsx`, `app/(dashboard)/orcamentos/[id]/page.tsx`

**Interfaces:**
- Consumes: `OrcamentoItemForm`/`OrcamentoItemValues` from Task 9, `Combobox` from `components/ui/Combobox.tsx`, `/api/orcamentos`, `/api/clientes`, `/api/substratos`, `/api/equipamentos`, `/api/configuracoes/parametros` (all from sub-project 1 or this plan's Task 7).
- Produces: the full Orçamentos UI — the detail page (`[id]/page.tsx`) is extended by Task 12 with the enviar/aprovar/duplicar/PDF/WhatsApp action buttons; this task only builds the view/edit form and the list.

**Design notes:** `OrcamentoForm` fetches the Cliente/Substrato/Equipamento catalogs and `ParametroCalculo` once on mount (four parallel `fetch` calls), guarding each with `Array.isArray`/`response.ok` checks per the pattern established in sub-project 1's final review (Finding 5) — a failed fetch shows an inline error instead of crashing. The list page shows a derived "Expirado" badge computed client-side (mirroring `estaExpirado`'s logic, since the list payload includes `createdAt`/`validadeDias`/`status` already).

- [ ] **Step 1: Create `components/forms/OrcamentoForm.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "@/components/ui/Combobox";
import OrcamentoItemForm, { type OrcamentoItemValues } from "@/components/forms/OrcamentoItemForm";

interface Cliente {
  id: string;
  nome: string;
}

interface SubstratoOpcao {
  id: string;
  nome: string;
  tipo: string;
  custoUnitario: number;
  percentualPerda: number;
  markup: number;
}

interface EquipamentoOpcao {
  id: string;
  nome: string;
  velocidade: number;
  tempoSetupMin: number;
  custoHora: number;
  percentualPerda: number;
}

interface Parametros {
  margemLucroPadrao: number;
  custoMaoObraHoraPadrao: number;
  percentualCustosIndiretosPadrao: number;
}

function itemVazio(margemPadrao: number): OrcamentoItemValues {
  return {
    descricao: "",
    tipo: "DIGITAL",
    substratoId: "",
    larguraCm: 0,
    alturaCm: 0,
    tiragem: 0,
    equipamentoId: "",
    chapaId: null,
    chapaQuantidade: null,
    tintaId: null,
    tintaQuantidade: null,
    acabamentoDescricao: "",
    acabamentoCusto: 0,
    margemLucro: margemPadrao,
  };
}

export interface OrcamentoFormInitial {
  id?: string;
  clienteId: string;
  observacoes: string;
  itens: OrcamentoItemValues[];
}

export default function OrcamentoForm({ initial }: { initial?: OrcamentoFormInitial }) {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [substratos, setSubstratos] = useState<SubstratoOpcao[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoOpcao[]>([]);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [erro, setErro] = useState("");

  const [clienteId, setClienteId] = useState(initial?.clienteId ?? "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [itens, setItens] = useState<OrcamentoItemValues[]>(initial?.itens ?? []);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/substratos").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/equipamentos").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/configuracoes/parametros").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([clientesData, substratosData, equipamentosData, parametrosData]) => {
        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setSubstratos(Array.isArray(substratosData) ? substratosData : []);
        setEquipamentos(Array.isArray(equipamentosData) ? equipamentosData : []);
        setParametros(parametrosData ?? null);
        if (!initial && itens.length === 0 && parametrosData) {
          setItens([itemVazio(parametrosData.margemLucroPadrao)]);
        }
      })
      .catch(() => setErro("Erro ao carregar dados de apoio"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function adicionarItem() {
    setItens((atual) => [...atual, itemVazio(parametros?.margemLucroPadrao ?? 0)]);
  }

  function atualizarItem(index: number, valor: OrcamentoItemValues) {
    setItens((atual) => atual.map((it, i) => (i === index ? valor : it)));
  }

  function removerItem(index: number) {
    setItens((atual) => atual.filter((_, i) => i !== index));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const payload = {
      clienteId,
      observacoes: observacoes || null,
      itens: itens.map((item) => ({
        ...item,
        acabamentoDescricao: item.acabamentoDescricao || null,
      })),
    };

    const url = initial?.id ? `/api/orcamentos/${initial.id}` : "/api/orcamentos";
    const method = initial?.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.error ?? "Erro ao salvar orçamento");
      return;
    }

    router.push("/orcamentos");
  }

  if (!parametros) {
    return <p className="text-sm text-gray-500">{erro || "Carregando..."}</p>;
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      {erro && <p className="text-sm text-rosa">{erro}</p>}

      <Combobox
        items={clientes}
        value={clientes.find((c) => c.id === clienteId) ?? null}
        onChange={(c) => setClienteId(c.id)}
        getLabel={(c) => c.nome}
        placeholder="Cliente"
      />

      <textarea
        placeholder="Observações"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />

      <div className="space-y-4">
        {itens.map((item, index) => (
          <OrcamentoItemForm
            key={index}
            value={item}
            onChange={(v) => atualizarItem(index, v)}
            onRemove={() => removerItem(index)}
            substratos={substratos}
            equipamentos={equipamentos}
            parametros={parametros}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={adicionarItem}
        className="rounded border border-ciano px-4 py-2 text-sm text-ciano"
      >
        + Adicionar item
      </button>

      <div className="flex justify-end">
        <button type="submit" className="rounded bg-ciano px-6 py-2 text-white">
          Salvar orçamento
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/orcamentos/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OrcamentoListado {
  id: string;
  numero: string;
  status: string;
  createdAt: string;
  validadeDias: number;
  cliente: { nome: string };
  itens: { precoFinal: number }[];
}

function estaExpirado(o: OrcamentoListado): boolean {
  if (o.status === "APROVADO") return false;
  const limite = new Date(o.createdAt);
  limite.setDate(limite.getDate() + o.validadeDias);
  return limite < new Date();
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoListado[]>([]);
  const [search, setSearch] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/orcamentos?search=${encodeURIComponent(search)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setOrcamentos(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar orçamentos");
      })
      .catch(() => setErro("Erro ao carregar orçamentos"));
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Orçamentos</h1>
        <Link href="/orcamentos/novo" className="rounded bg-ciano px-4 py-2 text-white">
          Novo orçamento
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por número ou cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border px-3 py-2"
      />

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Número</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.map((o) => (
            <tr key={o.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <a href={`/orcamentos/${o.id}`} className="text-ciano">
                  {o.numero}
                </a>
              </td>
              <td>{o.cliente.nome}</td>
              <td>{estaExpirado(o) ? "Expirado" : o.status}</td>
              <td>R$ {o.itens.reduce((soma, item) => soma + item.precoFinal, 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(dashboard)/orcamentos/novo/page.tsx`**

```tsx
import OrcamentoForm from "@/components/forms/OrcamentoForm";

export default function NovoOrcamentoPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Novo orçamento</h1>
      <OrcamentoForm />
    </div>
  );
}
```

- [ ] **Step 4: Create `app/(dashboard)/orcamentos/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { NotFoundError } from "@/lib/errors";
import OrcamentoForm, { type OrcamentoFormInitial } from "@/components/forms/OrcamentoForm";

export default async function OrcamentoDetalhePage({ params }: { params: { id: string } }) {
  let orcamento;
  try {
    orcamento = await buscarOrcamento(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const initial: OrcamentoFormInitial = {
    id: orcamento.id,
    clienteId: orcamento.clienteId,
    observacoes: orcamento.observacoes ?? "",
    itens: orcamento.itens
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        descricao: item.descricao,
        tipo: item.tipo as "DIGITAL" | "OFFSET",
        substratoId: item.substratoId,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        tiragem: item.tiragem,
        equipamentoId: item.equipamentoId,
        chapaId: item.chapaId,
        chapaQuantidade: item.chapaQuantidade,
        tintaId: item.tintaId,
        tintaQuantidade: item.tintaQuantidade,
        acabamentoDescricao: item.acabamentoDescricao ?? "",
        acabamentoCusto: item.acabamentoCusto,
        margemLucro: item.margemLucro,
      })),
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">
        Orçamento {orcamento.numero} — {orcamento.status}
      </h1>
      <OrcamentoForm initial={initial} />
    </div>
  );
}
```

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, log in, navigate to `/orcamentos`, create a new orçamento with at least one DIGITAL item and confirm the live preview updates, save it, confirm it appears in the list with a computed total, open it again and confirm the form is pre-filled correctly.

- [ ] **Step 7: Commit**

```bash
git add components/forms/OrcamentoForm.tsx "app/(dashboard)/orcamentos"
git commit -m "feat: add orcamento form, list, and create/edit pages"
```

---

### Task 11: PDF generation

**Files:**
- Modify: `package.json` (add `@react-pdf/renderer`)
- Create: `lib/pdf/orcamentoPdf.tsx`, `app/api/orcamentos/[id]/pdf/route.tsx` (`.tsx`, not `.ts` — this route file uses JSX)

**Interfaces:**
- Consumes: `OrcamentoComItens` type from `lib/services/orcamentoService.ts`.
- Produces: `OrcamentoPdfDocument` React component (the `@react-pdf/renderer` document) and the `/api/orcamentos/[id]/pdf` route — consumed by Task 12 (the "baixar PDF" button, and internally by the WhatsApp-send flow).

- [ ] **Step 1: Install the dependency**

Add to `package.json`'s `dependencies` (alphabetically, alongside the existing entries):

```json
    "@react-pdf/renderer": "3.4.4",
```

Run: `npm install`
Expected: installs without errors, `package-lock.json` updated.

- [ ] **Step 2: Create `lib/pdf/orcamentoPdf.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { OrcamentoComItens } from "@/lib/services/orcamentoService";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  header: { fontSize: 16, marginBottom: 4, color: "#1B3A66" },
  subheader: { fontSize: 10, marginBottom: 16, color: "#555555" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#1B3A66", paddingBottom: 4, fontSize: 9, color: "#1B3A66" },
  colDescricao: { flex: 3 },
  colTiragem: { flex: 1, textAlign: "right" },
  colPreco: { flex: 1, textAlign: "right" },
  total: { marginTop: 16, textAlign: "right", fontSize: 12, color: "#1B3A66" },
});

export function OrcamentoPdfDocument({ orcamento }: { orcamento: OrcamentoComItens }) {
  const total = orcamento.itens.reduce((soma, item) => soma + item.precoFinal, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Orçamento {orcamento.numero}</Text>
        <Text style={styles.subheader}>
          Cliente: {orcamento.cliente.nome} — Válido por {orcamento.validadeDias} dias
        </Text>

        <View style={styles.headerRow}>
          <Text style={styles.colDescricao}>Item</Text>
          <Text style={styles.colTiragem}>Tiragem</Text>
          <Text style={styles.colPreco}>Preço</Text>
        </View>

        {orcamento.itens.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colDescricao}>{item.descricao}</Text>
            <Text style={styles.colTiragem}>{item.tiragem}</Text>
            <Text style={styles.colPreco}>R$ {item.precoFinal.toFixed(2)}</Text>
          </View>
        ))}

        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>

        {orcamento.observacoes && (
          <Text style={{ marginTop: 16, fontSize: 9, color: "#555555" }}>
            Observações: {orcamento.observacoes}
          </Text>
        )}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Create `app/api/orcamentos/[id]/pdf/route.tsx`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { OrcamentoPdfDocument } from "@/lib/pdf/orcamentoPdf";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await buscarOrcamento(params.id);
    const buffer = await renderToBuffer(<OrcamentoPdfDocument orcamento={orcamento} />);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${orcamento.numero}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

Note: the `.tsx` extension is required here (not `.ts`) because the route handler renders JSX (`<OrcamentoPdfDocument ... />`) directly inside `renderToBuffer(...)`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify manually**

Run: `npm run dev`, log in, then:

```bash
curl -s -b cookies.txt http://localhost:3000/api/orcamentos/<id>/pdf -o orcamento.pdf
```

Expected: `orcamento.pdf` is a valid PDF file (open it and confirm it renders the orçamento's number, client, items, and total).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/pdf "app/api/orcamentos/[id]/pdf"
git commit -m "feat: add orcamento PDF generation"
```

---

### Task 12: Action buttons — enviar, aprovar, duplicar, PDF, WhatsApp

**Files:**
- Modify: `app/(dashboard)/orcamentos/[id]/page.tsx`

**Interfaces:**
- Consumes: `/api/orcamentos/[id]/enviar`, `/api/orcamentos/[id]/aprovar`, `/api/orcamentos/[id]/duplicar`, `/api/orcamentos/[id]/pdf` (all from Tasks 8/11), `cliente.telefone` (already loaded via `buscarOrcamento`'s `include: { cliente: true }`).
- Produces: the complete, final orçamento detail page — nothing else in this plan depends on it.

**Design notes:** this task turns `[id]/page.tsx` into a client component (it needs `onClick` handlers), moving the server-side data-fetching into a small wrapper so the page can still 404 via `notFound()` before hydration. The WhatsApp button downloads the PDF via a normal navigation to the PDF route (so the browser's native download happens), then opens `wa.me` in a new tab, then calls the `enviar` endpoint and reloads.

- [ ] **Step 1: Split `app/(dashboard)/orcamentos/[id]/page.tsx` into a server wrapper + client component**

Replace the entire contents of `app/(dashboard)/orcamentos/[id]/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { NotFoundError } from "@/lib/errors";
import OrcamentoDetalheClient from "./OrcamentoDetalheClient";

export default async function OrcamentoDetalhePage({ params }: { params: { id: string } }) {
  let orcamento;
  try {
    orcamento = await buscarOrcamento(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <OrcamentoDetalheClient
      id={orcamento.id}
      numero={orcamento.numero}
      status={orcamento.status}
      clienteTelefone={orcamento.cliente.telefone}
      clienteNome={orcamento.cliente.nome}
      initial={{
        id: orcamento.id,
        clienteId: orcamento.clienteId,
        observacoes: orcamento.observacoes ?? "",
        itens: orcamento.itens
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((item) => ({
            descricao: item.descricao,
            tipo: item.tipo as "DIGITAL" | "OFFSET",
            substratoId: item.substratoId,
            larguraCm: item.larguraCm,
            alturaCm: item.alturaCm,
            tiragem: item.tiragem,
            equipamentoId: item.equipamentoId,
            chapaId: item.chapaId,
            chapaQuantidade: item.chapaQuantidade,
            tintaId: item.tintaId,
            tintaQuantidade: item.tintaQuantidade,
            acabamentoDescricao: item.acabamentoDescricao ?? "",
            acabamentoCusto: item.acabamentoCusto,
            margemLucro: item.margemLucro,
          })),
      }}
    />
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/orcamentos/[id]/OrcamentoDetalheClient.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OrcamentoForm, { type OrcamentoFormInitial } from "@/components/forms/OrcamentoForm";

interface OrcamentoDetalheClientProps {
  id: string;
  numero: string;
  status: string;
  clienteNome: string;
  clienteTelefone: string | null;
  initial: OrcamentoFormInitial;
}

export default function OrcamentoDetalheClient({
  id,
  numero,
  status,
  clienteNome,
  clienteTelefone,
  initial,
}: OrcamentoDetalheClientProps) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function chamarAcao(acao: "enviar" | "aprovar" | "duplicar") {
    setErro("");
    setCarregando(true);
    const response = await fetch(`/api/orcamentos/${id}/${acao}`, { method: "POST" });
    setCarregando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.error ?? "Erro ao executar ação");
      return;
    }

    if (acao === "duplicar") {
      const copia = await response.json();
      router.push(`/orcamentos/${copia.id}`);
    } else {
      router.refresh();
    }
  }

  function enviarPorWhatsApp() {
    window.open(`/api/orcamentos/${id}/pdf`, "_blank");
    const telefoneDigits = (clienteTelefone ?? "").replace(/\D/g, "");
    const mensagem = encodeURIComponent(
      `Olá ${clienteNome}, segue o orçamento ${numero} da JETAPRINT.`
    );
    window.open(`https://wa.me/${telefoneDigits}?text=${mensagem}`, "_blank");
    chamarAcao("enviar");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">
          Orçamento {numero} — {status}
        </h1>
        <div className="flex gap-2">
          <a
            href={`/api/orcamentos/${id}/pdf`}
            className="rounded border border-ciano px-3 py-2 text-sm text-ciano"
          >
            Baixar PDF
          </a>
          {status === "RASCUNHO" && (
            <button
              type="button"
              disabled={carregando}
              onClick={enviarPorWhatsApp}
              className="rounded border border-ciano px-3 py-2 text-sm text-ciano"
            >
              Enviar por WhatsApp
            </button>
          )}
          {status === "ENVIADO" && (
            <button
              type="button"
              disabled={carregando}
              onClick={() => chamarAcao("aprovar")}
              className="rounded bg-ciano px-3 py-2 text-sm text-white"
            >
              Marcar como aprovado
            </button>
          )}
          <button
            type="button"
            disabled={carregando}
            onClick={() => chamarAcao("duplicar")}
            className="rounded border px-3 py-2 text-sm"
          >
            Duplicar
          </button>
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      {status === "APROVADO" ? (
        <p className="text-sm text-gray-500">
          Orçamento aprovado — os itens não podem mais ser editados.
        </p>
      ) : (
        <OrcamentoForm initial={initial} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, open an orçamento in RASCUNHO, click "Enviar por WhatsApp" and confirm the PDF downloads and a `wa.me` tab opens, then confirm the status changed to ENVIADO on reload; click "Marcar como aprovado" and confirm the form locks (shows the read-only message instead of the editable form); go back to the list, click "Duplicar" on an approved orçamento and confirm it creates a new RASCUNHO with a fresh número.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/orcamentos/[id]"
git commit -m "feat: wire orcamento actions (enviar, aprovar, duplicar, PDF, WhatsApp)"
```

---

## Final Notes

After Task 12, run the full verification pass before considering this sub-project done:

```bash
npx vitest run
npx tsc --noEmit
npm run build
```

All three must succeed. This plan does not include a final whole-branch review step in itself — if executed via `superpowers:subagent-driven-development`, that skill's final review phase covers it; if executed inline, run `superpowers:requesting-code-review` manually against the full diff before merging.
