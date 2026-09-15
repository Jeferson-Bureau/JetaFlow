# JetaFlow — Ordens de Serviço Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Ordens de Serviço (OS) module — converts an approved Orçamento into a production-floor job that moves through a fixed 8-stage workflow (Arquivo recebido → Pré-impressão → Produção → Acabamento → Conferência → Embalagem → Expedição → Concluído), with a visible delivery deadline.

**Architecture:** Extends the existing JetaFlow Next.js App Router app (sub-projects 1 and 2, already merged to `master`). Same layering as Orçamentos: a pure calculation module (`lib/services/ordemServicoCalculo.ts`) for the stage list and the "is it late" check; business logic + DB access in `lib/services/ordemServicoService.ts`; thin API route wrappers; React pages. An `OrdemServico` never duplicates an `Orcamento`'s items or prices — it reads them live through the relation, since an approved `Orcamento` is already immutable.

**Tech Stack:** Same as sub-projects 1-2 (Next.js 14 App Router, TypeScript, Prisma/SQLite, Zod, Vitest). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-jetaflow-ordens-servico-design.md`

## Global Constraints

- `OrdemServico.estagio` is a Prisma `String` field, not a Prisma `enum` block — validity enforced by Zod/TypeScript, same convention as every prior sub-project.
- Business logic lives in `lib/services/ordemServicoService.ts`, unit-tested directly against the real Prisma test DB. `ordemServicoCalculo.ts` is pure (no Prisma import) so it's safely importable into client components, same pattern as `orcamentoCalculo.ts`.
- API route handlers are thin wrappers (session lookup → service call → `handleApiError`), verified manually via `npm run dev`.
- **Permission model:** any authenticated user (ADMIN or OPERADOR) can convert an orçamento to an OS, advance/revert its stage, and edit prazo/observações — no `assertAdmin` gating anywhere in this module. Every route still requires a session (401 if `getSessionRole()` returns null).
- List search (`listarOrdensServico`) filters in JavaScript, not SQL `LIKE`.
- `OrdemServico` does not copy `Orcamento`'s items or prices — it reads them through the `orcamento` relation. No new `Orcamento.status` value is added for "converted" — that state is derived from whether an `OrdemServico` row exists for a given `orcamentoId` (checked via a direct query, not a redundant status field).
- `OrdemServico.orcamentoId` uses `onDelete: Restrict` (same rule as sub-project 2's required catalog/parent relations).
- Reuses `handleApiError`, `getSessionRole`, `ForbiddenError`/`NotFoundError` (all from sub-project 1, unchanged) and `alocarProximoNumero` (from sub-project 2, hardened in Task 2 of this plan — see below).

---

## File Structure

```
prisma/schema.prisma                       — add OrdemServico model + Orcamento inverse relation
lib/services/ordemServicoCalculo.ts        — ESTAGIOS_OS (fixed ordered list), estaAtrasada (pure)
lib/services/ordemServicoService.ts        — converterEmOS, list/buscar, avançar/voltar, atualizar
lib/validators/ordemServico.ts             — Zod schema for prazoEntrega/observacoes
app/api/orcamentos/[id]/converter-os/route.ts   — POST (creates the OS)
app/api/ordens-servico/route.ts                 — GET (list+search)
app/api/ordens-servico/[id]/route.ts            — GET, PUT (prazo/observações)
app/api/ordens-servico/[id]/avancar/route.ts    — POST
app/api/ordens-servico/[id]/voltar/route.ts     — POST
components/OrdemServicoEstagioBadge.tsx    — shared stage badge (list + detail)
app/(dashboard)/ordens-servico/page.tsx             — list, search, badge
app/(dashboard)/ordens-servico/[id]/page.tsx        — server wrapper (fetch + notFound)
app/(dashboard)/ordens-servico/[id]/OrdemServicoDetalheClient.tsx — detail UI + actions
tests/**                                   — mirrors lib/ structure
```

---

### Task 1: Prisma schema — OrdemServico model

**Files:**
- Modify: `prisma/schema.prisma`, `tests/setup.ts`, `lib/services/orcamentoService.ts`
- Test: `tests/lib/services/ordemServicoSchema.test.ts`

**Interfaces:**
- Consumes: existing `Orcamento` model (sub-project 2).
- Produces: `OrdemServico` Prisma model, `Orcamento.ordemServico` inverse relation — consumed by every later task in this plan. Also widens `OrcamentoComItens` (from `lib/services/orcamentoService.ts`, sub-project 2) to include the `ordemServico` relation, so the Orçamento detail page (Task 11) can tell whether an OS already exists without a second query.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/lib/services/ordemServicoSchema.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("OrdemServico schema", () => {
  it("creates an OrdemServico linked to an APROVADO orcamento", async () => {
    const cliente = await prisma.cliente.create({
      data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
    });
    const orcamento = await prisma.orcamento.create({
      data: { numero: "ORC0001", clienteId: cliente.id, validadeDias: 15, status: "APROVADO" },
    });

    const os = await prisma.ordemServico.create({
      data: { numero: "OS0001", orcamentoId: orcamento.id },
    });

    expect(os.estagio).toBe("ARQUIVO_RECEBIDO");
    expect(os.prazoEntrega).toBeNull();

    const orcamentoComOS = await prisma.orcamento.findUniqueOrThrow({
      where: { id: orcamento.id },
      include: { ordemServico: true },
    });
    expect(orcamentoComOS.ordemServico?.id).toBe(os.id);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run tests/lib/services/ordemServicoSchema.test.ts`
Expected: FAIL — `prisma.ordemServico` is not a function (model doesn't exist yet).

- [ ] **Step 3: Modify `prisma/schema.prisma`**

Add `ordemServico OrdemServico?` as the last field of the `Orcamento` model, so it reads:

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
  ordemServico  OrdemServico?
}
```

Append this new model at the end of the file:

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

- [ ] **Step 4: Update `tests/setup.ts`'s table-clearing order**

`OrdemServico.orcamentoId` uses `onDelete: Restrict`, same reasoning as sub-project 2's `OrcamentoItem`/`Orcamento` ordering fix — `OrdemServico` must be cleared before `Orcamento`, or a raw `DELETE FROM "Orcamento"` would fail with a foreign-key violation while an `OrdemServico` row still references it.

Modify `tests/setup.ts`'s `TABLES` array from:

```ts
const TABLES = [
  "OrcamentoItem", "Orcamento",
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];
```

to:

```ts
const TABLES = [
  "OrdemServico", "OrcamentoItem", "Orcamento",
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];
```

- [ ] **Step 5: Widen `OrcamentoComItens`'s include in `lib/services/orcamentoService.ts`**

The Orçamento detail page (Task 11) needs to know whether an `OrdemServico` already exists for the orçamento it's displaying, without a second round-trip query. Modify the `INCLUDE_ITENS_E_CLIENTE` constant from:

```ts
const INCLUDE_ITENS_E_CLIENTE = {
  itens: true,
  cliente: true,
} satisfies Prisma.OrcamentoInclude;
```

to:

```ts
const INCLUDE_ITENS_E_CLIENTE = {
  itens: true,
  cliente: true,
  ordemServico: true,
} satisfies Prisma.OrcamentoInclude;
```

This is a purely additive change to the shared type (`OrcamentoComItens`) — every existing consumer of that type (PDF generation, list/detail pages, etc.) keeps working unchanged since none of them destructure an exhaustive object shape.

- [ ] **Step 6: Regenerate the Prisma client and push the schema**

Run: `npx prisma generate`
Run: `npx prisma db push`

- [ ] **Step 7: Run the test again, verify it passes**

Run: `npx vitest run tests/lib/services/ordemServicoSchema.test.ts`
Expected: PASS

- [ ] **Step 8: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all existing tests still pass. Also run `npx tsc --noEmit` to confirm the widened `OrcamentoComItens` type didn't break any existing consumer.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma tests/setup.ts lib/services/orcamentoService.ts tests/lib/services/ordemServicoSchema.test.ts
git commit -m "feat: add OrdemServico model"
```

---

### Task 2: Harden document numbering against a missing NumeracaoDocumento row

**Files:**
- Modify: `lib/services/numeracaoService.ts`, `tests/lib/services/numeracaoService.test.ts`

**Interfaces:**
- Consumes: `prisma`.
- Produces: the same `alocarProximoNumero(tipoDocumento: string): Promise<string>` signature, now self-healing — consumed by this plan's `converterEmOS` (Task 5) and, retroactively, by sub-project 2's `criarOrcamento`/`duplicarOrcamento`.

**Why this is in scope here:** `lib/services/configuracaoService.ts`'s `listNumeracoes` (ADMIN-only, Configurações → Numeração tab) is currently the *only* code path that creates a `NumeracaoDocumento` row — it lazily upserts one the first time an ADMIN visits that screen. On a genuinely fresh database, nobody has necessarily done that yet, so `alocarProximoNumero`'s plain `prisma.numeracaoDocumento.update(...)` would throw a raw "record not found" error the first time anyone tries to create an Orçamento *or* convert one to an OS. This sub-project's core action (`converterEmOS`, Task 5) depends on this exact function for `"OS"` numbering, so fix the root cause here rather than requiring "visit Configurações first" as an undocumented setup step.

- [ ] **Step 1: Write the failing tests** (append to the existing `describe("alocarProximoNumero", ...)` block in `tests/lib/services/numeracaoService.test.ts`, after the existing two `it(...)` blocks)

```ts
  it("creates the row with the known default prefix for OS when it doesn't exist yet", async () => {
    const numero = await alocarProximoNumero("OS");
    expect(numero).toBe("OS0001");
  });

  it("creates the row with a fallback prefix (the tipoDocumento itself) when no default is known", async () => {
    const numero = await alocarProximoNumero("TIPO_DESCONHECIDO");
    expect(numero).toBe("TIPO_DESCONHECIDO0001");
  });
```

- [ ] **Step 2: Run the tests, verify the new ones fail**

Run: `npx vitest run tests/lib/services/numeracaoService.test.ts`
Expected: FAIL — the current implementation throws when the row doesn't exist (Prisma "record not found"), rather than returning `"OS0001"`/`"TIPO_DESCONHECIDO0001"`.

- [ ] **Step 3: Modify `lib/services/numeracaoService.ts`**

Replace its full contents with:

```ts
import { prisma } from "@/lib/prisma";

const PREFIXOS_PADRAO: Record<string, string> = {
  ORCAMENTO: "ORC",
  OS: "OS",
};

export async function alocarProximoNumero(tipoDocumento: string): Promise<string> {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento },
    update: {},
    create: {
      tipoDocumento,
      prefixo: PREFIXOS_PADRAO[tipoDocumento] ?? tipoDocumento,
      proximoNumero: 1,
      digitos: 4,
    },
  });

  const numeracao = await prisma.numeracaoDocumento.update({
    where: { tipoDocumento },
    data: { proximoNumero: { increment: 1 } },
  });
  const numeroAlocado = numeracao.proximoNumero - 1;
  return `${numeracao.prefixo}${String(numeroAlocado).padStart(numeracao.digitos, "0")}`;
}
```

The `upsert` with `update: {}` is a no-op when the row already exists (the common case, and what every existing test's `beforeEach` already sets up) — this only changes behavior when the row is genuinely missing.

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/numeracaoService.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass (this touches shared infrastructure Orçamentos also depends on — double-check `tests/lib/services/orcamentoService.test.ts` still passes).

- [ ] **Step 6: Commit**

```bash
git add lib/services/numeracaoService.ts tests/lib/services/numeracaoService.test.ts
git commit -m "fix: self-heal missing NumeracaoDocumento row in alocarProximoNumero"
```

---

### Task 3: Stage list and "is it late" calculation

**Files:**
- Create: `lib/services/ordemServicoCalculo.ts`, `tests/lib/services/ordemServicoCalculo.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no imports).
- Produces: `ESTAGIOS_OS` (readonly ordered tuple of the 8 stage strings), `estaAtrasada(estagio: string, prazoEntrega: Date | string | null): boolean` — consumed by Task 5/6 (`ordemServicoService.ts`, for both the stage-transition lookups and reusing `estaAtrasada` isn't needed server-side but the constant is), Task 9 (list page/badge), Task 10 (detail page).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/services/ordemServicoCalculo.test.ts
import { describe, it, expect } from "vitest";
import { ESTAGIOS_OS, estaAtrasada } from "@/lib/services/ordemServicoCalculo";

describe("ESTAGIOS_OS", () => {
  it("has the 8 stages in the correct order", () => {
    expect(ESTAGIOS_OS).toEqual([
      "ARQUIVO_RECEBIDO", "PRE_IMPRESSAO", "PRODUCAO", "ACABAMENTO",
      "CONFERENCIA", "EMBALAGEM", "EXPEDICAO", "CONCLUIDO",
    ]);
  });
});

describe("estaAtrasada", () => {
  it("is false when there is no prazoEntrega", () => {
    expect(estaAtrasada("PRODUCAO", null)).toBe(false);
  });

  it("is false when prazoEntrega is in the future", () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(estaAtrasada("PRODUCAO", amanha)).toBe(false);
  });

  it("is true when prazoEntrega is in the past and estagio is not CONCLUIDO", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(estaAtrasada("PRODUCAO", ontem)).toBe(true);
  });

  it("is false when prazoEntrega is in the past but estagio is CONCLUIDO", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(estaAtrasada("CONCLUIDO", ontem)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run tests/lib/services/ordemServicoCalculo.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/ordemServicoCalculo`.

- [ ] **Step 3: Create `lib/services/ordemServicoCalculo.ts`**

```ts
export const ESTAGIOS_OS = [
  "ARQUIVO_RECEBIDO",
  "PRE_IMPRESSAO",
  "PRODUCAO",
  "ACABAMENTO",
  "CONFERENCIA",
  "EMBALAGEM",
  "EXPEDICAO",
  "CONCLUIDO",
] as const;

export function estaAtrasada(estagio: string, prazoEntrega: Date | string | null): boolean {
  if (estagio === "CONCLUIDO" || !prazoEntrega) return false;
  return new Date(prazoEntrega) < new Date();
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/ordemServicoCalculo.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add lib/services/ordemServicoCalculo.ts tests/lib/services/ordemServicoCalculo.test.ts
git commit -m "feat: add ordem de servico stage list and atraso calculation"
```

---

### Task 4: Validator

**Files:**
- Create: `lib/validators/ordemServico.ts`, `tests/lib/validators/ordemServico.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ordemServicoInputSchema`, `OrdemServicoInput` — consumed by Task 6 (`atualizarOrdemServico`) and Task 7 (the `PUT` route).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/validators/ordemServico.test.ts
import { describe, it, expect } from "vitest";
import { ordemServicoInputSchema } from "@/lib/validators/ordemServico";

describe("ordemServicoInputSchema", () => {
  it("accepts a valid prazoEntrega and observacoes", () => {
    const result = ordemServicoInputSchema.safeParse({
      prazoEntrega: "2026-12-25",
      observacoes: "Entregar antes do meio-dia",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null prazoEntrega and observacoes", () => {
    const result = ordemServicoInputSchema.safeParse({ prazoEntrega: null, observacoes: null });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (both fields optional)", () => {
    const result = ordemServicoInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run tests/lib/validators/ordemServico.test.ts`
Expected: FAIL — cannot resolve `@/lib/validators/ordemServico`.

- [ ] **Step 3: Create `lib/validators/ordemServico.ts`**

```ts
import { z } from "zod";

export const ordemServicoInputSchema = z.object({
  prazoEntrega: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export type OrdemServicoInput = z.infer<typeof ordemServicoInputSchema>;
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/validators/ordemServico.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add lib/validators/ordemServico.ts tests/lib/validators/ordemServico.test.ts
git commit -m "feat: add ordem de servico validator"
```

---

### Task 5: Service — converter, listar, buscar

**Files:**
- Create: `lib/services/ordemServicoService.ts`, `tests/lib/services/ordemServicoService.test.ts`

**Interfaces:**
- Consumes: `prisma`, `alocarProximoNumero` from `lib/services/numeracaoService.ts`, `buscarOrcamento` from `lib/services/orcamentoService.ts`, `ForbiddenError`/`NotFoundError` from `lib/errors.ts`.
- Produces: `converterEmOS(orcamentoId: string)`, `listarOrdensServico(search?: string)`, `buscarOrdemServico(id: string)`, plus the shared type `OrdemServicoComOrcamento` (an `OrdemServico` with `orcamento.cliente` and `orcamento.itens` included) — consumed by Task 6 (this task's sibling, stage transitions), Task 7 (API routes), and the PDF-free UI in Tasks 9-11.

**Design notes:**
- `converterEmOS` throws `ForbiddenError` if the orçamento isn't `APROVADO`, and a separate `ForbiddenError` if an `OrdemServico` already exists for it (checked explicitly before the DB write, so the error message is friendly rather than a raw Prisma unique-constraint violation).
- No role parameter anywhere in this file — this module's permission model is "any authenticated user," enforced only at the route layer (session presence, not role).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/services/ordemServicoService.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  converterEmOS,
  listarOrdensServico,
  buscarOrdemServico,
} from "@/lib/services/ordemServicoService";

async function seedOrcamentoAprovado(overrides: { status?: string } = {}) {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento: "OS" },
    update: { prefixo: "OS", proximoNumero: 1, digitos: 4 },
    create: { tipoDocumento: "OS", prefixo: "OS", proximoNumero: 1, digitos: 4 },
  });
  const cliente = await prisma.cliente.create({
    data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
  });
  return prisma.orcamento.create({
    data: {
      numero: `ORC${Math.random().toString().slice(2, 8)}`,
      clienteId: cliente.id,
      validadeDias: 15,
      status: overrides.status ?? "APROVADO",
    },
  });
}

describe("ordemServicoService", () => {
  it("converts an APROVADO orcamento into an OS", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);

    expect(os.numero).toBe("OS0001");
    expect(os.estagio).toBe("ARQUIVO_RECEBIDO");
    expect(os.orcamento.id).toBe(orcamento.id);
  });

  it("rejects converting a non-APROVADO orcamento", async () => {
    const orcamento = await seedOrcamentoAprovado({ status: "RASCUNHO" });
    await expect(converterEmOS(orcamento.id)).rejects.toThrow(
      "Só é possível converter um orçamento aprovado em OS"
    );
  });

  it("rejects converting the same orcamento twice", async () => {
    const orcamento = await seedOrcamentoAprovado();
    await converterEmOS(orcamento.id);
    await expect(converterEmOS(orcamento.id)).rejects.toThrow(
      "Este orçamento já foi convertido em OS"
    );
  });

  it("lists and searches by cliente nome", async () => {
    const orcamento = await seedOrcamentoAprovado();
    await converterEmOS(orcamento.id);

    const resultados = await listarOrdensServico("Cliente Teste");
    expect(resultados).toHaveLength(1);
    const vazio = await listarOrdensServico("Nome Que Não Existe");
    expect(vazio).toHaveLength(0);
  });

  it("throws NotFoundError for a missing ordem de servico", async () => {
    await expect(buscarOrdemServico("id-inexistente")).rejects.toThrow("Não encontrado");
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run tests/lib/services/ordemServicoService.test.ts`
Expected: FAIL — cannot resolve `@/lib/services/ordemServicoService`.

- [ ] **Step 3: Create `lib/services/ordemServicoService.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

const INCLUDE_ORCAMENTO_COMPLETO = {
  orcamento: {
    include: { cliente: true, itens: true },
  },
} satisfies Prisma.OrdemServicoInclude;

export type OrdemServicoComOrcamento = Prisma.OrdemServicoGetPayload<{
  include: typeof INCLUDE_ORCAMENTO_COMPLETO;
}>;

export async function converterEmOS(orcamentoId: string): Promise<OrdemServicoComOrcamento> {
  const orcamento = await buscarOrcamento(orcamentoId);
  if (orcamento.status !== "APROVADO") {
    throw new ForbiddenError("Só é possível converter um orçamento aprovado em OS");
  }

  const existente = await prisma.ordemServico.findUnique({ where: { orcamentoId } });
  if (existente) {
    throw new ForbiddenError("Este orçamento já foi convertido em OS");
  }

  const numero = await alocarProximoNumero("OS");

  return prisma.ordemServico.create({
    data: { numero, orcamentoId },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}

export async function listarOrdensServico(search?: string): Promise<OrdemServicoComOrcamento[]> {
  const todas = await prisma.ordemServico.findMany({
    include: INCLUDE_ORCAMENTO_COMPLETO,
    orderBy: { createdAt: "desc" },
  });
  if (!search) return todas;
  const termo = search.toLowerCase();
  return todas.filter(
    (os) =>
      os.numero.toLowerCase().includes(termo) ||
      os.orcamento.cliente.nome.toLowerCase().includes(termo)
  );
}

export async function buscarOrdemServico(id: string): Promise<OrdemServicoComOrcamento> {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
  if (!ordem) throw new NotFoundError();
  return ordem;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/ordemServicoService.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/services/ordemServicoService.ts tests/lib/services/ordemServicoService.test.ts
git commit -m "feat: add ordem de servico conversion and read service"
```

---

### Task 6: Service — avançar, voltar, atualizar

**Files:**
- Modify: `lib/services/ordemServicoService.ts`, `tests/lib/services/ordemServicoService.test.ts`

**Interfaces:**
- Consumes: everything from Task 5 (same file), `ESTAGIOS_OS` from `lib/services/ordemServicoCalculo.ts`.
- Produces: `avancarEstagio(id: string)`, `voltarEstagio(id: string)`, `atualizarOrdemServico(id: string, input: OrdemServicoInput)` — consumed by Task 8 (action routes) and Task 7's `PUT` route.

- [ ] **Step 1: Add the failing tests** (append to `tests/lib/services/ordemServicoService.test.ts`, inside the existing `describe("ordemServicoService", ...)` block, after the last `it(...)`)

```ts
  it("advances an OS through the full 8-stage sequence", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);

    const sequenciaEsperada = [
      "PRE_IMPRESSAO", "PRODUCAO", "ACABAMENTO", "CONFERENCIA",
      "EMBALAGEM", "EXPEDICAO", "CONCLUIDO",
    ];

    let atual = os;
    for (const esperado of sequenciaEsperada) {
      atual = await avancarEstagio(atual.id);
      expect(atual.estagio).toBe(esperado);
    }
  });

  it("rejects advancing past CONCLUIDO", async () => {
    const orcamento = await seedOrcamentoAprovado();
    let os = await converterEmOS(orcamento.id);
    for (let i = 0; i < 7; i++) {
      os = await avancarEstagio(os.id);
    }
    expect(os.estagio).toBe("CONCLUIDO");
    await expect(avancarEstagio(os.id)).rejects.toThrow(
      "Ordem de serviço já está no último estágio"
    );
  });

  it("reverts an OS to the previous stage", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);
    const avancada = await avancarEstagio(os.id);
    expect(avancada.estagio).toBe("PRE_IMPRESSAO");

    const revertida = await voltarEstagio(avancada.id);
    expect(revertida.estagio).toBe("ARQUIVO_RECEBIDO");
  });

  it("rejects reverting past ARQUIVO_RECEBIDO", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);
    await expect(voltarEstagio(os.id)).rejects.toThrow(
      "Ordem de serviço já está no primeiro estágio"
    );
  });

  it("updates prazoEntrega and observacoes without touching estagio", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);

    const atualizada = await atualizarOrdemServico(os.id, {
      prazoEntrega: "2026-12-25",
      observacoes: "Entregar antes do meio-dia",
    });

    expect(atualizada.observacoes).toBe("Entregar antes do meio-dia");
    expect(atualizada.prazoEntrega?.toISOString().slice(0, 10)).toBe("2026-12-25");
    expect(atualizada.estagio).toBe("ARQUIVO_RECEBIDO");
  });
```

Also update the test file's import line to include the new functions:

```ts
import {
  converterEmOS,
  listarOrdensServico,
  buscarOrdemServico,
  avancarEstagio,
  voltarEstagio,
  atualizarOrdemServico,
} from "@/lib/services/ordemServicoService";
```

- [ ] **Step 2: Run the tests, verify the new ones fail**

Run: `npx vitest run tests/lib/services/ordemServicoService.test.ts`
Expected: FAIL — `avancarEstagio`/`voltarEstagio`/`atualizarOrdemServico` are not exported.

- [ ] **Step 3: Append to `lib/services/ordemServicoService.ts`**

Add the import at the top of the file (alongside the existing imports):

```ts
import { ESTAGIOS_OS } from "@/lib/services/ordemServicoCalculo";
import type { OrdemServicoInput } from "@/lib/validators/ordemServico";
```

Append these functions at the end of the file:

```ts
export async function atualizarOrdemServico(
  id: string,
  input: OrdemServicoInput
): Promise<OrdemServicoComOrcamento> {
  await buscarOrdemServico(id);
  return prisma.ordemServico.update({
    where: { id },
    data: {
      prazoEntrega: input.prazoEntrega ? new Date(input.prazoEntrega) : null,
      observacoes: input.observacoes ?? null,
    },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}

export async function avancarEstagio(id: string): Promise<OrdemServicoComOrcamento> {
  const existente = await buscarOrdemServico(id);
  const indiceAtual = ESTAGIOS_OS.indexOf(existente.estagio as (typeof ESTAGIOS_OS)[number]);
  if (indiceAtual === ESTAGIOS_OS.length - 1) {
    throw new ForbiddenError("Ordem de serviço já está no último estágio");
  }
  const proximoEstagio = ESTAGIOS_OS[indiceAtual + 1];
  return prisma.ordemServico.update({
    where: { id },
    data: { estagio: proximoEstagio, estagioDesde: new Date() },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}

export async function voltarEstagio(id: string): Promise<OrdemServicoComOrcamento> {
  const existente = await buscarOrdemServico(id);
  const indiceAtual = ESTAGIOS_OS.indexOf(existente.estagio as (typeof ESTAGIOS_OS)[number]);
  if (indiceAtual === 0) {
    throw new ForbiddenError("Ordem de serviço já está no primeiro estágio");
  }
  const estagioAnterior = ESTAGIOS_OS[indiceAtual - 1];
  return prisma.ordemServico.update({
    where: { id },
    data: { estagio: estagioAnterior, estagioDesde: new Date() },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run tests/lib/services/ordemServicoService.test.ts`
Expected: PASS (10/10)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/services/ordemServicoService.ts tests/lib/services/ordemServicoService.test.ts
git commit -m "feat: add ordem de servico stage transitions and update"
```

---

### Task 7: API routes — converter, listar, buscar, atualizar

**Files:**
- Create: `app/api/orcamentos/[id]/converter-os/route.ts`, `app/api/ordens-servico/route.ts`, `app/api/ordens-servico/[id]/route.ts`

**Interfaces:**
- Consumes: `getSessionRole` from `lib/permissions.ts`, `handleApiError` from `lib/api-helpers.ts`, `ordemServicoInputSchema` from `lib/validators/ordemServico.ts`, `converterEmOS`/`listarOrdensServico`/`buscarOrdemServico`/`atualizarOrdemServico` from `lib/services/ordemServicoService.ts`.
- Produces: the `/api/orcamentos/[id]/converter-os`, `/api/ordens-servico`, and `/api/ordens-servico/[id]` HTTP surface — consumed by Task 9-11 (UI pages).

- [ ] **Step 1: Create `app/api/orcamentos/[id]/converter-os/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { converterEmOS } from "@/lib/services/ordemServicoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordemServico = await converterEmOS(params.id);
    return NextResponse.json(ordemServico, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Create `app/api/ordens-servico/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { listarOrdensServico } from "@/lib/services/ordemServicoService";

export async function GET(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const ordens = await listarOrdensServico(search);
    return NextResponse.json(ordens);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 3: Create `app/api/ordens-servico/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { ordemServicoInputSchema } from "@/lib/validators/ordemServico";
import { buscarOrdemServico, atualizarOrdemServico } from "@/lib/services/ordemServicoService";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordem = await buscarOrdemServico(params.id);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const input = ordemServicoInputSchema.parse(await request.json());
    const ordem = await atualizarOrdemServico(params.id, input);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in with a real session (curl + cookie jar, following the same pattern used in sub-project 2's API-route tasks), create an orçamento, send it, approve it, then:

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/orcamentos/<id>/converter-os
```

Expected: 201 with `numero: "OS0001"`, `estagio: "ARQUIVO_RECEBIDO"`. Then `GET /api/ordens-servico` should list it, `GET /api/ordens-servico/<osId>` should return it, `PUT` with a `prazoEntrega` should update it.

- [ ] **Step 5: Commit**

```bash
git add "app/api/orcamentos/[id]/converter-os" app/api/ordens-servico/route.ts "app/api/ordens-servico/[id]/route.ts"
git commit -m "feat: add ordem de servico conversion and CRUD API routes"
```

---

### Task 8: API routes — avançar, voltar

**Files:**
- Create: `app/api/ordens-servico/[id]/avancar/route.ts`, `app/api/ordens-servico/[id]/voltar/route.ts`

**Interfaces:**
- Consumes: `getSessionRole`, `handleApiError`, `avancarEstagio`/`voltarEstagio` from `lib/services/ordemServicoService.ts`.
- Produces: the two stage-transition endpoints — consumed by Task 10 (detail page's Avançar/Voltar buttons).

- [ ] **Step 1: Create `app/api/ordens-servico/[id]/avancar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { avancarEstagio } from "@/lib/services/ordemServicoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordem = await avancarEstagio(params.id);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Create `app/api/ordens-servico/[id]/voltar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { voltarEstagio } from "@/lib/services/ordemServicoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordem = await voltarEstagio(params.id);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, log in, using an OS created in an earlier manual test (or create a fresh one):

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/ordens-servico/<id>/avancar
curl -s -b cookies.txt -X POST http://localhost:3000/api/ordens-servico/<id>/voltar
```

Expected: first call returns `estagio: "PRE_IMPRESSAO"`; second returns `estagio: "ARQUIVO_RECEBIDO"`.

- [ ] **Step 4: Commit**

```bash
git add "app/api/ordens-servico/[id]/avancar" "app/api/ordens-servico/[id]/voltar"
git commit -m "feat: add ordem de servico stage-transition API routes"
```

---

### Task 9: Stage badge and list page

**Files:**
- Create: `components/OrdemServicoEstagioBadge.tsx`, `app/(dashboard)/ordens-servico/page.tsx`

**Interfaces:**
- Consumes: `estaAtrasada` from `lib/services/ordemServicoCalculo.ts`, `/api/ordens-servico`.
- Produces: `OrdemServicoEstagioBadge` component — consumed by Task 10 (detail page).

**Design notes:** `OrdemServicoEstagioBadge` is a small presentational component (no state, no fetch) so it's trivially reusable — it takes `estagio`/`prazoEntrega` as props and computes "is it late" itself via the shared pure function, rather than each page recomputing and passing a boolean.

- [ ] **Step 1: Create `components/OrdemServicoEstagioBadge.tsx`**

```tsx
import { estaAtrasada } from "@/lib/services/ordemServicoCalculo";

const LABELS: Record<string, string> = {
  ARQUIVO_RECEBIDO: "Arquivo recebido",
  PRE_IMPRESSAO: "Pré-impressão",
  PRODUCAO: "Produção",
  ACABAMENTO: "Acabamento",
  CONFERENCIA: "Conferência",
  EMBALAGEM: "Embalagem",
  EXPEDICAO: "Expedição",
  CONCLUIDO: "Concluído",
};

export default function OrdemServicoEstagioBadge({
  estagio,
  prazoEntrega,
}: {
  estagio: string;
  prazoEntrega: string | null;
}) {
  const atrasada = estaAtrasada(estagio, prazoEntrega);
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium text-white ${
        atrasada ? "bg-rosa" : "bg-ciano"
      }`}
    >
      {LABELS[estagio] ?? estagio}
      {atrasada && " — Atrasada"}
    </span>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/ordens-servico/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OrdemServicoEstagioBadge from "@/components/OrdemServicoEstagioBadge";

interface OrdemServicoListada {
  id: string;
  numero: string;
  estagio: string;
  prazoEntrega: string | null;
  orcamento: {
    cliente: { nome: string };
    itens: { precoFinal: number }[];
  };
}

export default function OrdensServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServicoListada[]>([]);
  const [search, setSearch] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/ordens-servico?search=${encodeURIComponent(search)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setOrdens(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar ordens de serviço");
      })
      .catch(() => setErro("Erro ao carregar ordens de serviço"));
  }, [search]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Ordens de Serviço</h1>

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
            <th>Estágio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ordens.map((os) => (
            <tr key={os.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/ordens-servico/${os.id}`} className="text-ciano">
                  {os.numero}
                </Link>
              </td>
              <td>{os.orcamento.cliente.nome}</td>
              <td>
                <OrdemServicoEstagioBadge estagio={os.estagio} prazoEntrega={os.prazoEntrega} />
              </td>
              <td>
                R${" "}
                {os.orcamento.itens
                  .reduce((soma, item) => soma + item.precoFinal, 0)
                  .toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, navigate to `/ordens-servico`, confirm the list renders (empty or with any OS created during earlier manual testing) and the search box filters.

- [ ] **Step 5: Commit**

```bash
git add components/OrdemServicoEstagioBadge.tsx "app/(dashboard)/ordens-servico/page.tsx"
git commit -m "feat: add ordem de servico stage badge and list page"
```

---

### Task 10: Detail page

**Files:**
- Create: `app/(dashboard)/ordens-servico/[id]/page.tsx`, `app/(dashboard)/ordens-servico/[id]/OrdemServicoDetalheClient.tsx`

**Interfaces:**
- Consumes: `buscarOrdemServico` from `lib/services/ordemServicoService.ts`, `OrdemServicoEstagioBadge` from Task 9, `/api/ordens-servico/[id]`, `/api/ordens-servico/[id]/avancar`, `/api/ordens-servico/[id]/voltar`.
- Produces: the complete OS detail page — nothing else in this plan depends on it.

**Design notes:** same server-wrapper + client-component split as `Orcamento`'s detail page (sub-project 2, Task 12) — the server component fetches and handles `notFound()`, the client component owns the interactive buttons and the prazo/observações edit form.

- [ ] **Step 1: Create `app/(dashboard)/ordens-servico/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { buscarOrdemServico } from "@/lib/services/ordemServicoService";
import { NotFoundError } from "@/lib/errors";
import OrdemServicoDetalheClient from "./OrdemServicoDetalheClient";

export default async function OrdemServicoDetalhePage({ params }: { params: { id: string } }) {
  let ordem;
  try {
    ordem = await buscarOrdemServico(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const total = ordem.orcamento.itens.reduce((soma, item) => soma + item.precoFinal, 0);

  return (
    <OrdemServicoDetalheClient
      id={ordem.id}
      numero={ordem.numero}
      estagio={ordem.estagio}
      estagioDesde={ordem.estagioDesde.toISOString()}
      prazoEntrega={ordem.prazoEntrega ? ordem.prazoEntrega.toISOString().slice(0, 10) : ""}
      observacoes={ordem.observacoes ?? ""}
      clienteNome={ordem.orcamento.cliente.nome}
      itens={ordem.orcamento.itens
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => ({
          id: item.id,
          descricao: item.descricao,
          tiragem: item.tiragem,
          precoFinal: item.precoFinal,
        }))}
      total={total}
    />
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/ordens-servico/[id]/OrdemServicoDetalheClient.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrdemServicoEstagioBadge from "@/components/OrdemServicoEstagioBadge";

interface ItemResumo {
  id: string;
  descricao: string;
  tiragem: number;
  precoFinal: number;
}

interface OrdemServicoDetalheClientProps {
  id: string;
  numero: string;
  estagio: string;
  estagioDesde: string;
  prazoEntrega: string;
  observacoes: string;
  clienteNome: string;
  itens: ItemResumo[];
  total: number;
}

export default function OrdemServicoDetalheClient({
  id,
  numero,
  estagio,
  estagioDesde,
  prazoEntrega: prazoEntregaInicial,
  observacoes: observacoesInicial,
  clienteNome,
  itens,
  total,
}: OrdemServicoDetalheClientProps) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [prazoEntrega, setPrazoEntrega] = useState(prazoEntregaInicial);
  const [observacoes, setObservacoes] = useState(observacoesInicial);

  async function avancarOuVoltar(acao: "avancar" | "voltar") {
    setErro("");
    setCarregando(true);
    const response = await fetch(`/api/ordens-servico/${id}/${acao}`, { method: "POST" });
    setCarregando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao mudar estágio");
      return;
    }
    router.refresh();
  }

  async function salvarDetalhes(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const response = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prazoEntrega: prazoEntrega || null,
        observacoes: observacoes || null,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao salvar");
      return;
    }
    router.refresh();
  }

  const desde = new Date(estagioDesde);
  const horasNoEstagio = Math.max(0, Math.round((Date.now() - desde.getTime()) / (1000 * 60 * 60)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">
          OS {numero} — {clienteNome}
        </h1>
        <OrdemServicoEstagioBadge estagio={estagio} prazoEntrega={prazoEntrega || null} />
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Neste estágio há {horasNoEstagio}h — Total:{" "}
        <span className="font-semibold text-marinho">R$ {total.toFixed(2)}</span>
      </p>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          disabled={carregando || estagio === "ARQUIVO_RECEBIDO"}
          onClick={() => avancarOuVoltar("voltar")}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          Voltar estágio
        </button>
        <button
          type="button"
          disabled={carregando || estagio === "CONCLUIDO"}
          onClick={() => avancarOuVoltar("avancar")}
          className="rounded bg-ciano px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Avançar estágio
        </button>
      </div>

      <table className="mb-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Item</th>
            <th>Tiragem</th>
            <th>Preço</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.descricao}</td>
              <td>{item.tiragem}</td>
              <td>R$ {item.precoFinal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvarDetalhes} className="max-w-sm space-y-3">
        <label className="block text-sm">
          Prazo de entrega
          <input
            type="date"
            value={prazoEntrega}
            onChange={(e) => setPrazoEntrega(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Observações
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded bg-ciano px-4 py-2 text-sm text-white">
          Salvar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, open an OS created during earlier manual testing (or convert a fresh approved orçamento), confirm the detail page renders cliente/itens/total correctly, click "Avançar estágio" and confirm the badge updates, click "Voltar estágio" and confirm it reverts, edit the prazo/observações and confirm they persist after a refresh.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/ordens-servico/[id]"
git commit -m "feat: add ordem de servico detail page"
```

---

### Task 11: Wire "Converter em OS" into the Orçamento detail page

**Files:**
- Modify: `app/(dashboard)/orcamentos/[id]/page.tsx`, `app/(dashboard)/orcamentos/[id]/OrcamentoDetalheClient.tsx`

**Interfaces:**
- Consumes: `POST /api/orcamentos/[id]/converter-os` (Task 7), `orcamento.ordemServico` (now available on `OrcamentoComItens` since Task 1 widened its include).
- Produces: the finished cross-module link between Orçamentos and Ordens de Serviço — nothing else in this plan depends on it. This is the final task of this plan.

- [ ] **Step 1: Modify `app/(dashboard)/orcamentos/[id]/page.tsx`**

Add one new prop to the `<OrcamentoDetalheClient>` call. The current file passes `id`, `numero`, `status`, `createdAt`, `validadeDias`, `total`, `clienteTelefone`, `clienteNome`, `initial`. Add `ordemServicoId={orcamento.ordemServico?.id ?? null}` to that list (order doesn't matter, add it anywhere among the existing props — e.g. right after `total`):

```tsx
      total={total}
      ordemServicoId={orcamento.ordemServico?.id ?? null}
      clienteTelefone={orcamento.cliente.telefone}
```

- [ ] **Step 2: Modify `app/(dashboard)/orcamentos/[id]/OrcamentoDetalheClient.tsx`**

Add the `Link` import at the top of the file (alongside the existing `useRouter`/`useState` imports):

```tsx
import Link from "next/link";
```

Add `ordemServicoId: string | null;` to the `OrcamentoDetalheClientProps` interface (anywhere among the existing fields), and destructure it as a parameter in the component function signature alongside the existing props.

Add this function near `enviarPorWhatsApp` (same component, before the `return`):

```tsx
  async function converterEmOS() {
    setErro("");
    setCarregando(true);
    const response = await fetch(`/api/orcamentos/${id}/converter-os`, { method: "POST" });
    setCarregando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.error ?? "Erro ao converter em OS");
      return;
    }

    const os = await response.json();
    router.push(`/ordens-servico/${os.id}`);
  }
```

In the JSX, inside the action-buttons `<div className="flex gap-2">`, add this block right after the "Duplicar" `<button>` (so it reads: PDF link, WhatsApp/aprovar conditional buttons, Duplicar button, then this new conditional block):

```tsx
          {status === "APROVADO" &&
            (ordemServicoId ? (
              <Link
                href={`/ordens-servico/${ordemServicoId}`}
                className="rounded border border-ciano px-3 py-2 text-sm text-ciano"
              >
                Ver OS
              </Link>
            ) : (
              <button
                type="button"
                disabled={carregando}
                onClick={converterEmOS}
                className="rounded bg-ciano px-3 py-2 text-sm text-white"
              >
                Converter em OS
              </button>
            ))}
```

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, open an `APROVADO` orçamento that has NOT yet been converted, confirm the "Converter em OS" button appears, click it, confirm you land on the new OS's detail page in `ARQUIVO_RECEBIDO`. Navigate back to the orçamento's detail page and confirm the button is now replaced with a "Ver OS" link pointing at the same OS. Also confirm a `RASCUNHO`/`ENVIADO` orçamento shows neither button/link.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/orcamentos/[id]/page.tsx" "app/(dashboard)/orcamentos/[id]/OrcamentoDetalheClient.tsx"
git commit -m "feat: wire converter-em-OS button into orcamento detail page"
```

---

## Final Notes

After Task 11, run the full verification pass before considering this sub-project done:

```bash
npx vitest run
npx tsc --noEmit
npm run build
```

All three must succeed. This plan does not include a final whole-branch review step in itself — if executed via `superpowers:subagent-driven-development`, that skill's final review phase covers it; if executed inline, run `superpowers:requesting-code-review` manually against the full diff before merging.
