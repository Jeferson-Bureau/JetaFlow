# JetaFlow — Licitações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let JETAPRINT track licitações it has decided to monitor — pulling official data from the PNCP (Portal Nacional de Contratações Públicas) public API by pasting a "Número de Controle PNCP", plus recording internal tracking state (status, proposed value, responsible person, notes).

**Architecture:** Extends the existing JetaFlow Next.js App Router app (sub-projects 1-4, already merged to `master`). New external API client (`lib/external/pncp.ts`) follows the existing `brasilapi.ts`/`viacep.ts` pattern (thin function, typed result or `null`, mocked `fetch` in tests). Business logic in `lib/services/licitacaoService.ts`; a pure calculation module (`lib/services/licitacaoCalculo.ts`) for the status list and "proposal closed" check; thin API route wrappers; React pages. `Licitacao` stores a snapshot of PNCP data (refreshed only via an explicit "Atualizar" button) plus JETAPRINT's own internal tracking fields.

**Tech Stack:** Same as sub-projects 1-4 (Next.js 14 App Router, TypeScript, Prisma/SQLite, Zod, Vitest). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-jetaflow-licitacoes-design.md`

## Global Constraints

- `Licitacao.statusInterno` is a Prisma `String` field, not a Prisma `enum` — validity enforced by Zod/TypeScript, same convention as every prior sub-project.
- Business logic lives in `lib/services/licitacaoService.ts`, unit-tested directly against the real Prisma test DB, with `lib/external/pncp.ts`'s `buscarContratacaoPNCP` mocked (`vi.mock`). `licitacaoCalculo.ts` is pure (no Prisma import) so it's safely importable into client components.
- **Permission model:** any authenticated user (ADMIN or OPERADOR) can do everything in this module — no `assertAdmin` gating anywhere. Every route still requires a session (401 if `getSessionRole()` returns null).
- List search (`listarLicitacoes`) filters in JavaScript, not SQL `LIKE`.
- `lib/external/pncp.ts` follows the exact pattern of `lib/external/brasilapi.ts`: a thin function returning a typed result or `null`, **always sends a `User-Agent` header** (sub-project 1's lesson — a missing `User-Agent` caused a 403 from BrasilAPI's CNPJ lookup), and its automated tests mock `fetch` via `vi.stubGlobal` — never hit the real network in the test suite.
- `cadastrarLicitacao` checks for a duplicate `numeroControlePNCP` **before** calling the PNCP API, to avoid an unnecessary external call when the error is already detectable locally.
- No vínculo with Orçamentos/Ordens de Serviço — this module is fully standalone, no foreign keys to any other model.

---

## File Structure

```
prisma/schema.prisma                                — add Licitacao model
tests/setup.ts                                       — add "Licitacao" to TABLES
lib/services/licitacaoCalculo.ts                     — STATUS_INTERNO_LICITACAO (fixed ordered list), propostaEncerrada (pure)
lib/external/pncp.ts                                 — parseNumeroControlePNCP, buscarContratacaoPNCP
lib/validators/licitacao.ts                          — licitacaoInputSchema, licitacaoInternoInputSchema
lib/services/licitacaoService.ts                     — cadastrarLicitacao, listarLicitacoes, buscarLicitacao, atualizarDadosPNCP, atualizarDadosInternos, excluirLicitacao
app/api/licitacoes/route.ts                          — GET (listar+busca), POST (cadastrar)
app/api/licitacoes/[id]/route.ts                     — GET, PUT (dados internos), DELETE
app/api/licitacoes/[id]/atualizar/route.ts           — POST (rebusca no PNCP)
components/LicitacaoStatusBadge.tsx                  — badge compartilhado (lista + detalhe)
app/(dashboard)/licitacoes/page.tsx                  — lista, busca, badge
app/(dashboard)/licitacoes/nova/page.tsx             — form: colar Número de Controle PNCP
app/(dashboard)/licitacoes/[id]/page.tsx             — server wrapper (fetch + notFound)
app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx — detalhe: dados PNCP read-only + form interno + Atualizar + Excluir
tests/**                                             — mirrors lib/ structure
```

---

### Task 1: Prisma schema — Licitacao model

**Files:**
- Modify: `prisma/schema.prisma`, `tests/setup.ts`
- Test: `tests/lib/services/licitacaoSchema.test.ts`

**Interfaces:**
- Consumes: nothing (standalone model, no foreign keys to any other model).
- Produces: `Licitacao` Prisma model — consumed by every later task in this plan.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/lib/services/licitacaoSchema.test.ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Licitacao schema", () => {
  it("creates a Licitacao with the expected defaults", async () => {
    const licitacao = await prisma.licitacao.create({
      data: {
        numeroControlePNCP: "01612441000107-1-000131/2026",
        cnpjOrgao: "01612441000107",
        anoCompra: 2026,
        sequencialCompra: 131,
        orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA",
        unidadeNome: "Prefeitura Municipal de Bela Vista da Caroba",
        numeroCompra: "PR53",
        objetoCompra: "Contratação de licença de uso de software",
        modalidadeNome: "Pregão - Eletrônico",
        situacaoCompraNome: "Divulgada no PNCP",
        dataAtualizacaoPNCP: new Date(),
      },
    });

    expect(licitacao.statusInterno).toBe("ANALISANDO");
    expect(licitacao.valorProposta).toBeNull();
    expect(licitacao.responsavel).toBeNull();
  });

  it("enforces uniqueness on numeroControlePNCP", async () => {
    const data = {
      numeroControlePNCP: "01612441000107-1-000131/2026",
      cnpjOrgao: "01612441000107",
      anoCompra: 2026,
      sequencialCompra: 131,
      orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA",
      unidadeNome: "Prefeitura Municipal de Bela Vista da Caroba",
      numeroCompra: "PR53",
      objetoCompra: "Contratação de licença de uso de software",
      modalidadeNome: "Pregão - Eletrônico",
      situacaoCompraNome: "Divulgada no PNCP",
      dataAtualizacaoPNCP: new Date(),
    };
    await prisma.licitacao.create({ data });
    await expect(prisma.licitacao.create({ data })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run tests/lib/services/licitacaoSchema.test.ts`
Expected: FAIL — `prisma.licitacao` is not a function (model doesn't exist yet).

- [ ] **Step 3: Append the new model to `prisma/schema.prisma`**

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

- [ ] **Step 4: Update `tests/setup.ts`'s table-clearing list**

`Licitacao` has no foreign keys to any other table, so its position in the list doesn't matter for FK safety — add it anywhere. Modify `tests/setup.ts`'s `TABLES` array from:

```ts
const TABLES = [
  "Volume", "Expedicao", "OrdemServico", "OrcamentoItem", "Orcamento",
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];
```

to:

```ts
const TABLES = [
  "Licitacao", "Volume", "Expedicao", "OrdemServico", "OrcamentoItem", "Orcamento",
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];
```

- [ ] **Step 5: Regenerate the Prisma client and push the schema**

Run: `npx prisma generate`
Run: `npx prisma db push`

- [ ] **Step 6: Run the test again, verify it passes**

Run: `npx vitest run tests/lib/services/licitacaoSchema.test.ts`
Expected: PASS

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all existing tests still pass. Also run `npx tsc --noEmit`.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma tests/setup.ts tests/lib/services/licitacaoSchema.test.ts
git commit -m "feat: add Licitacao model"
```

---

### Task 2: Pure calculation module — licitacaoCalculo.ts

**Files:**
- Create: `lib/services/licitacaoCalculo.ts`, `tests/lib/services/licitacaoCalculo.test.ts`

**Interfaces:**
- Consumes: nothing (pure, zero imports).
- Produces: `STATUS_INTERNO_LICITACAO` (fixed ordered array), `propostaEncerrada(dataEncerramentoProposta: Date | string | null): boolean` — consumed by `licitacaoService.ts`/validators (Task 4/5/6) and the UI (Tasks 9, 11).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/services/licitacaoCalculo.test.ts
import { describe, it, expect } from "vitest";
import { STATUS_INTERNO_LICITACAO, propostaEncerrada } from "@/lib/services/licitacaoCalculo";

describe("STATUS_INTERNO_LICITACAO", () => {
  it("has the 6 statuses in the expected order", () => {
    expect(STATUS_INTERNO_LICITACAO).toEqual([
      "ANALISANDO", "VAMOS_PARTICIPAR", "PROPOSTA_ENVIADA",
      "GANHAMOS", "PERDEMOS", "DESISTIMOS",
    ]);
  });
});

describe("propostaEncerrada", () => {
  it("is false when there is no dataEncerramentoProposta", () => {
    expect(propostaEncerrada(null)).toBe(false);
  });

  it("is false when dataEncerramentoProposta is in the future", () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(propostaEncerrada(amanha)).toBe(false);
  });

  it("is true when dataEncerramentoProposta is in the past", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(propostaEncerrada(ontem)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/lib/services/licitacaoCalculo.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/licitacaoCalculo.ts
export const STATUS_INTERNO_LICITACAO = [
  "ANALISANDO", "VAMOS_PARTICIPAR", "PROPOSTA_ENVIADA",
  "GANHAMOS", "PERDEMOS", "DESISTIMOS",
] as const;

export function propostaEncerrada(dataEncerramentoProposta: Date | string | null): boolean {
  if (!dataEncerramentoProposta) return false;
  return new Date(dataEncerramentoProposta) < new Date();
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/lib/services/licitacaoCalculo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/services/licitacaoCalculo.ts tests/lib/services/licitacaoCalculo.test.ts
git commit -m "feat: add licitacao calculo module"
```

---

### Task 3: PNCP external client

**Files:**
- Create: `lib/external/pncp.ts`, `tests/lib/external/pncp.test.ts`

**Interfaces:**
- Consumes: nothing (fetch-based, zero internal imports beyond the `PncpContratacaoResult`/`NumeroControlePNCPParseado` types it defines itself).
- Produces: `PncpContratacaoResult` type, `NumeroControlePNCPParseado` type, `parseNumeroControlePNCP(numero: string): NumeroControlePNCPParseado | null`, `buscarContratacaoPNCP(cnpj: string, ano: number, sequencial: number): Promise<PncpContratacaoResult | null>` — consumed by `licitacaoService.ts` (Tasks 5-6).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/external/pncp.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { parseNumeroControlePNCP, buscarContratacaoPNCP } from "@/lib/external/pncp";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseNumeroControlePNCP", () => {
  it("parses a valid Número de Controle PNCP", () => {
    const result = parseNumeroControlePNCP("01612441000107-1-000131/2026");
    expect(result).toEqual({ cnpj: "01612441000107", ano: 2026, sequencial: 131 });
  });

  it("returns null for an invalid format", () => {
    expect(parseNumeroControlePNCP("nao-e-um-numero-valido")).toBeNull();
    expect(parseNumeroControlePNCP("")).toBeNull();
    expect(parseNumeroControlePNCP("123-1-000131/2026")).toBeNull();
  });

  it("trims surrounding whitespace before parsing", () => {
    const result = parseNumeroControlePNCP("  01612441000107-1-000131/2026  ");
    expect(result).toEqual({ cnpj: "01612441000107", ano: 2026, sequencial: 131 });
  });
});

describe("buscarContratacaoPNCP", () => {
  it("maps a successful response to PncpContratacaoResult", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        orgaoEntidade: { razaoSocial: "MUNICIPIO DE BELA VISTA DO CAROBA" },
        unidadeOrgao: { nomeUnidade: "Prefeitura Municipal de Bela Vista da Caroba" },
        numeroCompra: "PR53",
        objetoCompra: "Contratação de licença de uso de software",
        modalidadeNome: "Pregão - Eletrônico",
        situacaoCompraNome: "Divulgada no PNCP",
        valorTotalEstimado: 46150,
        valorTotalHomologado: null,
        dataAberturaProposta: "2026-08-25T08:00:01",
        dataEncerramentoProposta: "2026-09-10T08:00:01",
      }),
    }));

    const result = await buscarContratacaoPNCP("01612441000107", 2026, 131);
    expect(result?.orgaoNome).toBe("MUNICIPIO DE BELA VISTA DO CAROBA");
    expect(result?.numeroCompra).toBe("PR53");
    expect(result?.valorTotalEstimado).toBe(46150);
    expect(result?.valorTotalHomologado).toBeNull();
  });

  it("returns null when the API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await buscarContratacaoPNCP("00000000000000", 2026, 1);
    expect(result).toBeNull();
  });

  it("returns null when fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await buscarContratacaoPNCP("01612441000107", 2026, 131);
    expect(result).toBeNull();
  });

  it("sends a User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        orgaoEntidade: {}, unidadeOrgao: {}, numeroCompra: "", objetoCompra: "",
        modalidadeNome: "", situacaoCompraNome: "",
        valorTotalEstimado: null, valorTotalHomologado: null,
        dataAberturaProposta: null, dataEncerramentoProposta: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await buscarContratacaoPNCP("01612441000107", 2026, 131);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["User-Agent"]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/lib/external/pncp.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// lib/external/pncp.ts
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

export function parseNumeroControlePNCP(numero: string): NumeroControlePNCPParseado | null {
  const match = numero.trim().match(/^(\d{14})-\d-(\d+)\/(\d{4})$/);
  if (!match) return null;
  return {
    cnpj: match[1],
    sequencial: parseInt(match[2], 10),
    ano: parseInt(match[3], 10),
  };
}

export async function buscarContratacaoPNCP(
  cnpj: string,
  ano: number,
  sequencial: number
): Promise<PncpContratacaoResult | null> {
  try {
    const response = await fetch(
      `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`,
      { headers: { "User-Agent": "JetaFlow/0.1 (+https://jetaprint.com.br)" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      orgaoNome: data.orgaoEntidade?.razaoSocial ?? "",
      unidadeNome: data.unidadeOrgao?.nomeUnidade ?? "",
      numeroCompra: data.numeroCompra ?? "",
      objetoCompra: data.objetoCompra ?? "",
      modalidadeNome: data.modalidadeNome ?? "",
      situacaoCompraNome: data.situacaoCompraNome ?? "",
      valorTotalEstimado: data.valorTotalEstimado ?? null,
      valorTotalHomologado: data.valorTotalHomologado ?? null,
      dataAberturaProposta: data.dataAberturaProposta ?? null,
      dataEncerramentoProposta: data.dataEncerramentoProposta ?? null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/lib/external/pncp.test.ts`
Expected: PASS

- [ ] **Step 5: Verify manually against the real PNCP API**

Run this one-off script with `npx tsx` (or equivalent) to confirm the real endpoint still behaves as the mocked tests assume — this is not a checked-in test, just a manual sanity check:

```ts
import { buscarContratacaoPNCP } from "./lib/external/pncp";
buscarContratacaoPNCP("01612441000107", 2026, 131).then((r) => console.log(JSON.stringify(r, null, 2)));
```

Expected: a real object with `orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA"` (or similar real data — this specific record was confirmed live during the sub-project's feasibility spike; if it's no longer available, pick any other real record via `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=<8-digit-date>&dataFinal=<8-digit-date>&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=10` and use its `orgaoEntidade.cnpj`/`anoCompra`/`sequencialCompra`). Report the real observed output in your task report — not just "it worked".

- [ ] **Step 6: Commit**

```bash
git add lib/external/pncp.ts tests/lib/external/pncp.test.ts
git commit -m "feat: add PNCP external client"
```

---

### Task 4: Validators

**Files:**
- Create: `lib/validators/licitacao.ts`, `tests/lib/validators/licitacao.test.ts`

**Interfaces:**
- Consumes: `zod`, `STATUS_INTERNO_LICITACAO` (`lib/services/licitacaoCalculo.ts`, Task 2).
- Produces: `licitacaoInputSchema`, `LicitacaoInput` type, `licitacaoInternoInputSchema`, `LicitacaoInternoInput` type — consumed by `licitacaoService.ts` (Tasks 5-6) and the API routes (Tasks 7-8).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/validators/licitacao.test.ts
import { describe, it, expect } from "vitest";
import { licitacaoInputSchema, licitacaoInternoInputSchema } from "@/lib/validators/licitacao";

describe("licitacaoInputSchema", () => {
  it("accepts a non-empty numeroControlePNCP", () => {
    expect(
      licitacaoInputSchema.safeParse({ numeroControlePNCP: "01612441000107-1-000131/2026" }).success
    ).toBe(true);
  });

  it("rejects an empty numeroControlePNCP", () => {
    expect(licitacaoInputSchema.safeParse({ numeroControlePNCP: "" }).success).toBe(false);
  });
});

describe("licitacaoInternoInputSchema", () => {
  it("accepts a valid statusInterno with optional fields omitted", () => {
    expect(licitacaoInternoInputSchema.safeParse({ statusInterno: "ANALISANDO" }).success).toBe(true);
  });

  it("rejects an invalid statusInterno", () => {
    expect(licitacaoInternoInputSchema.safeParse({ statusInterno: "INVALIDO" }).success).toBe(false);
  });

  it("accepts all optional fields populated", () => {
    const result = licitacaoInternoInputSchema.safeParse({
      statusInterno: "VAMOS_PARTICIPAR",
      valorProposta: 45000,
      responsavel: "Maria",
      observacoes: "Cliente prioritário",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for optional fields", () => {
    const result = licitacaoInternoInputSchema.safeParse({
      statusInterno: "ANALISANDO",
      valorProposta: null,
      responsavel: null,
      observacoes: null,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/lib/validators/licitacao.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// lib/validators/licitacao.ts
import { z } from "zod";
import { STATUS_INTERNO_LICITACAO } from "@/lib/services/licitacaoCalculo";

export const licitacaoInputSchema = z.object({
  numeroControlePNCP: z.string().min(1, "Número de Controle PNCP obrigatório"),
});

export type LicitacaoInput = z.infer<typeof licitacaoInputSchema>;

export const licitacaoInternoInputSchema = z.object({
  statusInterno: z.enum(STATUS_INTERNO_LICITACAO),
  valorProposta: z.number().nullable().optional(),
  responsavel: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export type LicitacaoInternoInput = z.infer<typeof licitacaoInternoInputSchema>;
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/lib/validators/licitacao.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/validators/licitacao.ts tests/lib/validators/licitacao.test.ts
git commit -m "feat: add licitacao validators"
```

---

### Task 5: Service — cadastrar, listar, buscar

**Files:**
- Create: `lib/services/licitacaoService.ts`, `tests/lib/services/licitacaoService.test.ts`

**Interfaces:**
- Consumes: `parseNumeroControlePNCP`/`buscarContratacaoPNCP` (`lib/external/pncp.ts`, Task 3), `ForbiddenError`/`NotFoundError` (`lib/errors.ts`), `prisma` (`lib/prisma.ts`).
- Produces: `cadastrarLicitacao(numeroControlePNCP: string): Promise<Licitacao>`, `listarLicitacoes(search?: string): Promise<Licitacao[]>`, `buscarLicitacao(id: string): Promise<Licitacao>` — consumed by Task 6 (same file), the API routes (Task 7), and the UI (Tasks 9-11). `Licitacao` here is the Prisma-generated model type (`import type { Licitacao } from "@prisma/client"`) — this model has no included relations, so no custom payload type is needed (unlike `OrdemServicoComOrcamento`/`ExpedicaoComVolumes` in prior sub-projects).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/services/licitacaoService.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as pncp from "@/lib/external/pncp";
import { cadastrarLicitacao, listarLicitacoes, buscarLicitacao } from "@/lib/services/licitacaoService";

vi.mock("@/lib/external/pncp", async () => {
  const actual = await vi.importActual<typeof import("@/lib/external/pncp")>("@/lib/external/pncp");
  return { ...actual, buscarContratacaoPNCP: vi.fn() };
});

const DADOS_PNCP_MOCK = {
  orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA",
  unidadeNome: "Prefeitura Municipal de Bela Vista da Caroba",
  numeroCompra: "PR53",
  objetoCompra: "Contratação de licença de uso de software",
  modalidadeNome: "Pregão - Eletrônico",
  situacaoCompraNome: "Divulgada no PNCP",
  valorTotalEstimado: 46150,
  valorTotalHomologado: null,
  dataAberturaProposta: "2026-08-25T08:00:01",
  dataEncerramentoProposta: "2026-09-10T08:00:01",
};

beforeEach(() => {
  vi.mocked(pncp.buscarContratacaoPNCP).mockReset();
});

describe("cadastrarLicitacao", () => {
  it("creates a Licitacao from a valid Número de Controle PNCP", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);

    const licitacao = await cadastrarLicitacao("01612441000107-1-000131/2026");

    expect(licitacao.numeroControlePNCP).toBe("01612441000107-1-000131/2026");
    expect(licitacao.cnpjOrgao).toBe("01612441000107");
    expect(licitacao.anoCompra).toBe(2026);
    expect(licitacao.sequencialCompra).toBe(131);
    expect(licitacao.orgaoNome).toBe("MUNICIPIO DE BELA VISTA DO CAROBA");
    expect(licitacao.statusInterno).toBe("ANALISANDO");
    expect(pncp.buscarContratacaoPNCP).toHaveBeenCalledWith("01612441000107", 2026, 131);
  });

  it("rejects an invalid Número de Controle PNCP format", async () => {
    await expect(cadastrarLicitacao("formato-invalido")).rejects.toThrow(
      "Número de Controle PNCP em formato inválido"
    );
    expect(pncp.buscarContratacaoPNCP).not.toHaveBeenCalled();
  });

  it("rejects a duplicate numeroControlePNCP without calling the PNCP API", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    await cadastrarLicitacao("01612441000107-1-000131/2026");
    vi.mocked(pncp.buscarContratacaoPNCP).mockClear();

    await expect(cadastrarLicitacao("01612441000107-1-000131/2026")).rejects.toThrow(
      "Esta licitação já está cadastrada"
    );
    expect(pncp.buscarContratacaoPNCP).not.toHaveBeenCalled();
  });

  it("rejects when the PNCP API returns null (not found)", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(null);
    await expect(cadastrarLicitacao("01612441000107-1-000131/2026")).rejects.toThrow(
      "Licitação não encontrada no PNCP"
    );
  });
});

describe("listarLicitacoes", () => {
  it("lists and searches by objetoCompra/orgaoNome/numeroCompra", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    await cadastrarLicitacao("01612441000107-1-000131/2026");

    const resultados = await listarLicitacoes("Bela Vista");
    expect(resultados).toHaveLength(1);
    const vazio = await listarLicitacoes("Nao Existe Nenhuma Palavra Dessas");
    expect(vazio).toHaveLength(0);
  });
});

describe("buscarLicitacao", () => {
  it("throws NotFoundError for a missing licitacao", async () => {
    await expect(buscarLicitacao("id-inexistente")).rejects.toThrow("Não encontrado");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/lib/services/licitacaoService.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// lib/services/licitacaoService.ts
import { prisma } from "@/lib/prisma";
import { parseNumeroControlePNCP, buscarContratacaoPNCP } from "@/lib/external/pncp";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Licitacao } from "@prisma/client";

export async function cadastrarLicitacao(numeroControlePNCP: string): Promise<Licitacao> {
  const parseado = parseNumeroControlePNCP(numeroControlePNCP);
  if (!parseado) {
    throw new ForbiddenError("Número de Controle PNCP em formato inválido");
  }

  const existente = await prisma.licitacao.findUnique({ where: { numeroControlePNCP } });
  if (existente) {
    throw new ForbiddenError("Esta licitação já está cadastrada");
  }

  const dados = await buscarContratacaoPNCP(parseado.cnpj, parseado.ano, parseado.sequencial);
  if (!dados) {
    throw new NotFoundError("Licitação não encontrada no PNCP");
  }

  return prisma.licitacao.create({
    data: {
      numeroControlePNCP,
      cnpjOrgao: parseado.cnpj,
      anoCompra: parseado.ano,
      sequencialCompra: parseado.sequencial,
      orgaoNome: dados.orgaoNome,
      unidadeNome: dados.unidadeNome,
      numeroCompra: dados.numeroCompra,
      objetoCompra: dados.objetoCompra,
      modalidadeNome: dados.modalidadeNome,
      situacaoCompraNome: dados.situacaoCompraNome,
      valorTotalEstimado: dados.valorTotalEstimado,
      valorTotalHomologado: dados.valorTotalHomologado,
      dataAberturaProposta: dados.dataAberturaProposta ? new Date(dados.dataAberturaProposta) : null,
      dataEncerramentoProposta: dados.dataEncerramentoProposta
        ? new Date(dados.dataEncerramentoProposta)
        : null,
      dataAtualizacaoPNCP: new Date(),
      statusInterno: "ANALISANDO",
    },
  });
}

export async function listarLicitacoes(search?: string): Promise<Licitacao[]> {
  const todas = await prisma.licitacao.findMany({ orderBy: { createdAt: "desc" } });
  if (!search) return todas;
  const termo = search.toLowerCase();
  return todas.filter(
    (l) =>
      l.objetoCompra.toLowerCase().includes(termo) ||
      l.orgaoNome.toLowerCase().includes(termo) ||
      l.numeroCompra.toLowerCase().includes(termo)
  );
}

export async function buscarLicitacao(id: string): Promise<Licitacao> {
  const licitacao = await prisma.licitacao.findUnique({ where: { id } });
  if (!licitacao) throw new NotFoundError();
  return licitacao;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/lib/services/licitacaoService.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass. Also run `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add lib/services/licitacaoService.ts tests/lib/services/licitacaoService.test.ts
git commit -m "feat: add licitacao registration and lookup service"
```

---

### Task 6: Service — atualizar dados PNCP, atualizar dados internos, excluir

**Files:**
- Modify: `lib/services/licitacaoService.ts`, `tests/lib/services/licitacaoService.test.ts`

**Interfaces:**
- Consumes: `LicitacaoInternoInput` (`lib/validators/licitacao.ts`, Task 4), `buscarLicitacao` (same file, Task 5).
- Produces: `atualizarDadosPNCP(id: string): Promise<Licitacao>`, `atualizarDadosInternos(id: string, input: LicitacaoInternoInput): Promise<Licitacao>`, `excluirLicitacao(id: string): Promise<void>` — consumed by the API routes (Tasks 7-8).

- [ ] **Step 1: Write the failing tests**

Change the import line at the top of `tests/lib/services/licitacaoService.test.ts` from:

```ts
import { cadastrarLicitacao, listarLicitacoes, buscarLicitacao } from "@/lib/services/licitacaoService";
```

to:

```ts
import {
  cadastrarLicitacao, listarLicitacoes, buscarLicitacao,
  atualizarDadosPNCP, atualizarDadosInternos, excluirLicitacao,
} from "@/lib/services/licitacaoService";
```

Add this import at the top of the file too:

```ts
import type { LicitacaoInternoInput } from "@/lib/validators/licitacao";
```

Then append these `describe` blocks at the end of the file:

```ts
describe("atualizarDadosPNCP", () => {
  it("refreshes the snapshot fields without touching internal fields", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue({
      ...DADOS_PNCP_MOCK,
      situacaoCompraNome: "Encerrada",
      valorTotalHomologado: 44000,
    });

    const atualizada = await atualizarDadosPNCP(criada.id);

    expect(atualizada.situacaoCompraNome).toBe("Encerrada");
    expect(atualizada.valorTotalHomologado).toBe(44000);
    expect(atualizada.statusInterno).toBe("ANALISANDO");
    expect(pncp.buscarContratacaoPNCP).toHaveBeenLastCalledWith("01612441000107", 2026, 131);
  });

  it("throws NotFoundError when the PNCP API no longer has the record", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(null);
    await expect(atualizarDadosPNCP(criada.id)).rejects.toThrow("Licitação não encontrada no PNCP");
  });
});

describe("atualizarDadosInternos", () => {
  it("updates only the internal fields, leaving the PNCP snapshot untouched", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    const input: LicitacaoInternoInput = {
      statusInterno: "VAMOS_PARTICIPAR",
      valorProposta: 45000,
      responsavel: "Maria",
      observacoes: "Cliente prioritário",
    };
    const atualizada = await atualizarDadosInternos(criada.id, input);

    expect(atualizada.statusInterno).toBe("VAMOS_PARTICIPAR");
    expect(atualizada.valorProposta).toBe(45000);
    expect(atualizada.responsavel).toBe("Maria");
    expect(atualizada.observacoes).toBe("Cliente prioritário");
    expect(atualizada.orgaoNome).toBe(criada.orgaoNome);
    expect(atualizada.situacaoCompraNome).toBe(criada.situacaoCompraNome);
  });
});

describe("excluirLicitacao", () => {
  it("deletes the licitacao", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    await excluirLicitacao(criada.id);

    await expect(buscarLicitacao(criada.id)).rejects.toThrow("Não encontrado");
  });

  it("throws NotFoundError when deleting a missing licitacao", async () => {
    await expect(excluirLicitacao("id-inexistente")).rejects.toThrow("Não encontrado");
  });
});
```

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `npx vitest run tests/lib/services/licitacaoService.test.ts`
Expected: FAIL — the three new functions aren't exported yet.

- [ ] **Step 3: Append the implementation to `lib/services/licitacaoService.ts`**

Change the import line:

```ts
import type { Licitacao } from "@prisma/client";
```

to add the validator type import above it:

```ts
import type { LicitacaoInternoInput } from "@/lib/validators/licitacao";
import type { Licitacao } from "@prisma/client";
```

Append these functions at the end of the file:

```ts
export async function atualizarDadosPNCP(id: string): Promise<Licitacao> {
  const licitacao = await buscarLicitacao(id);
  const dados = await buscarContratacaoPNCP(
    licitacao.cnpjOrgao,
    licitacao.anoCompra,
    licitacao.sequencialCompra
  );
  if (!dados) {
    throw new NotFoundError("Licitação não encontrada no PNCP");
  }

  return prisma.licitacao.update({
    where: { id },
    data: {
      orgaoNome: dados.orgaoNome,
      unidadeNome: dados.unidadeNome,
      numeroCompra: dados.numeroCompra,
      objetoCompra: dados.objetoCompra,
      modalidadeNome: dados.modalidadeNome,
      situacaoCompraNome: dados.situacaoCompraNome,
      valorTotalEstimado: dados.valorTotalEstimado,
      valorTotalHomologado: dados.valorTotalHomologado,
      dataAberturaProposta: dados.dataAberturaProposta ? new Date(dados.dataAberturaProposta) : null,
      dataEncerramentoProposta: dados.dataEncerramentoProposta
        ? new Date(dados.dataEncerramentoProposta)
        : null,
      dataAtualizacaoPNCP: new Date(),
    },
  });
}

export async function atualizarDadosInternos(
  id: string,
  input: LicitacaoInternoInput
): Promise<Licitacao> {
  await buscarLicitacao(id);
  return prisma.licitacao.update({
    where: { id },
    data: {
      statusInterno: input.statusInterno,
      valorProposta: input.valorProposta ?? null,
      responsavel: input.responsavel ?? null,
      observacoes: input.observacoes ?? null,
    },
  });
}

export async function excluirLicitacao(id: string): Promise<void> {
  await buscarLicitacao(id);
  await prisma.licitacao.delete({ where: { id } });
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/lib/services/licitacaoService.test.ts`
Expected: PASS (13 tests total: 6 from Task 5 + 7 from this task)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass. Also run `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add lib/services/licitacaoService.ts tests/lib/services/licitacaoService.test.ts
git commit -m "feat: add licitacao refresh, internal update, and delete to service"
```

---

### Task 7: API routes — listar, cadastrar, buscar, atualizar dados internos, excluir

**Files:**
- Create: `app/api/licitacoes/route.ts`, `app/api/licitacoes/[id]/route.ts`

**Interfaces:**
- Consumes: `getSessionRole` (`lib/permissions.ts`), `handleApiError` (`lib/api-helpers.ts`), `cadastrarLicitacao`/`listarLicitacoes`/`buscarLicitacao`/`atualizarDadosInternos`/`excluirLicitacao` (`lib/services/licitacaoService.ts`, Tasks 5-6), `licitacaoInputSchema`/`licitacaoInternoInputSchema` (`lib/validators/licitacao.ts`, Task 4).
- Produces: `GET/POST /api/licitacoes`, `GET/PUT/DELETE /api/licitacoes/[id]` — consumed by the UI (Tasks 9-11).

- [ ] **Step 1: Write `app/api/licitacoes/route.ts`**

```ts
// app/api/licitacoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { cadastrarLicitacao, listarLicitacoes } from "@/lib/services/licitacaoService";
import { licitacaoInputSchema } from "@/lib/validators/licitacao";

export async function GET(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const licitacoes = await listarLicitacoes(search);
  return NextResponse.json(licitacoes);
}

export async function POST(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const input = licitacaoInputSchema.parse(body);
    const licitacao = await cadastrarLicitacao(input.numeroControlePNCP);
    return NextResponse.json(licitacao, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Write `app/api/licitacoes/[id]/route.ts`**

```ts
// app/api/licitacoes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarLicitacao, atualizarDadosInternos, excluirLicitacao } from "@/lib/services/licitacaoService";
import { licitacaoInternoInputSchema } from "@/lib/validators/licitacao";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const licitacao = await buscarLicitacao(params.id);
    return NextResponse.json(licitacao);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const input = licitacaoInternoInputSchema.parse(body);
    const licitacao = await atualizarDadosInternos(params.id, input);
    return NextResponse.json(licitacao);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    await excluirLicitacao(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev` on an unused port (NOT 3000 — that's reserved; check `netstat -ano | grep LISTENING | grep :30` first), log in, and via curl (with the session cookie):
- `POST /api/licitacoes` with body `{"numeroControlePNCP": "01612441000107-1-000131/2026"}` (or any other currently-live real Número de Controle PNCP if this one is no longer available) — expect 201 with the created licitação.
- `GET /api/licitacoes` — expect 200 with an array containing it.
- `GET /api/licitacoes/<id>` — expect 200 with the same data.
- `PUT /api/licitacoes/<id>` with body `{"statusInterno": "VAMOS_PARTICIPAR", "valorProposta": 45000}` — expect 200 with the updated fields.
- `POST /api/licitacoes` with the same `numeroControlePNCP` again — expect 409 (duplicate, mapped from `ForbiddenError` — actually check `lib/api-helpers.ts`'s exact mapping and report the real observed status).
- `DELETE /api/licitacoes/<id>` — expect 204, then `GET /api/licitacoes/<id>` — expect 404.
- Unauthenticated request to any of these routes — expect the real observed status (this app's middleware redirects unauthenticated matched routes with 307 — not a bug, established behavior).

Show the real observed responses (status codes, actual ids/data) in your report, not just "it worked".

- [ ] **Step 4: Commit**

```bash
git add app/api/licitacoes/route.ts "app/api/licitacoes/[id]/route.ts"
git commit -m "feat: add licitacao CRUD API routes"
```

---

### Task 8: API route — atualizar dados do PNCP

**Files:**
- Create: `app/api/licitacoes/[id]/atualizar/route.ts`

**Interfaces:**
- Consumes: `getSessionRole`, `handleApiError`, `atualizarDadosPNCP` (`lib/services/licitacaoService.ts`, Task 6).
- Produces: `POST /api/licitacoes/[id]/atualizar` — consumed by the UI (Task 11).

- [ ] **Step 1: Write the route**

```ts
// app/api/licitacoes/[id]/atualizar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { atualizarDadosPNCP } from "@/lib/services/licitacaoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const licitacao = await atualizarDadosPNCP(params.id);
    return NextResponse.json(licitacao);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev` on an unused port (not 3000), log in. Using a licitação created in Task 7's manual verification (or a fresh one):
- `POST /api/licitacoes/<id>/atualizar` — expect 200 with the (re-fetched) licitação data; confirm `dataAtualizacaoPNCP` in the response is a fresh timestamp.
- `POST /api/licitacoes/<id-inexistente>/atualizar` — expect 404.
- Unauthenticated request — observe the real status.

Show real observed responses in your report.

- [ ] **Step 3: Commit**

```bash
git add "app/api/licitacoes/[id]/atualizar/route.ts"
git commit -m "feat: add licitacao PNCP refresh API route"
```

---

### Task 9: Status badge and list page

**Files:**
- Create: `components/LicitacaoStatusBadge.tsx`, `app/(dashboard)/licitacoes/page.tsx`

**Interfaces:**
- Consumes: `STATUS_INTERNO_LICITACAO`/`propostaEncerrada` (`lib/services/licitacaoCalculo.ts`, Task 2), `GET /api/licitacoes` (Task 7).
- Produces: `LicitacaoStatusBadge` component (also consumed by Task 11's detail page) and the list page.

- [ ] **Step 1: Write `components/LicitacaoStatusBadge.tsx`**

```tsx
// components/LicitacaoStatusBadge.tsx
import { propostaEncerrada } from "@/lib/services/licitacaoCalculo";

const LABELS: Record<string, string> = {
  ANALISANDO: "Analisando",
  VAMOS_PARTICIPAR: "Vamos participar",
  PROPOSTA_ENVIADA: "Proposta enviada",
  GANHAMOS: "Ganhamos",
  PERDEMOS: "Perdemos",
  DESISTIMOS: "Desistimos",
};

const CORES: Record<string, string> = {
  ANALISANDO: "bg-gray-400",
  VAMOS_PARTICIPAR: "bg-ciano",
  PROPOSTA_ENVIADA: "bg-amarelo",
  GANHAMOS: "bg-ciano",
  PERDEMOS: "bg-rosa",
  DESISTIMOS: "bg-gray-400",
};

export default function LicitacaoStatusBadge({
  statusInterno,
  dataEncerramentoProposta,
}: {
  statusInterno: string;
  dataEncerramentoProposta: string | null;
}) {
  const encerrada = propostaEncerrada(dataEncerramentoProposta);
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`rounded px-2 py-1 text-xs font-medium text-white ${CORES[statusInterno] ?? "bg-gray-400"}`}
      >
        {LABELS[statusInterno] ?? statusInterno}
      </span>
      {encerrada && (
        <span className="rounded bg-rosa px-2 py-1 text-xs font-medium text-white">
          Proposta encerrada
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Write `app/(dashboard)/licitacoes/page.tsx`**

```tsx
// app/(dashboard)/licitacoes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LicitacaoStatusBadge from "@/components/LicitacaoStatusBadge";

interface LicitacaoListada {
  id: string;
  numeroCompra: string;
  orgaoNome: string;
  objetoCompra: string;
  statusInterno: string;
  dataEncerramentoProposta: string | null;
}

export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoListada[]>([]);
  const [search, setSearch] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/licitacoes?search=${encodeURIComponent(search)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setLicitacoes(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar licitações");
      })
      .catch(() => setErro("Erro ao carregar licitações"));
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Licitações</h1>
        <Link href="/licitacoes/nova" className="rounded bg-ciano px-4 py-2 text-sm text-white">
          Nova Licitação
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por objeto, órgão ou número..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border px-3 py-2"
      />

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Número</th>
            <th>Órgão</th>
            <th>Objeto</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {licitacoes.map((l) => (
            <tr key={l.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/licitacoes/${l.id}`} className="text-ciano">
                  {l.numeroCompra}
                </Link>
              </td>
              <td>{l.orgaoNome}</td>
              <td className="max-w-xs truncate">{l.objetoCompra}</td>
              <td>
                <LicitacaoStatusBadge
                  statusInterno={l.statusInterno}
                  dataEncerramentoProposta={l.dataEncerramentoProposta}
                />
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
Expected: clean.

- [ ] **Step 4: Verify manually**

Run: `npm run dev` on an unused port (not 3000), log in, navigate to `/licitacoes`. Confirm the list renders (using a licitação created in earlier manual testing), search filters correctly, and the status badge shows the right label/color.

- [ ] **Step 5: Commit**

```bash
git add components/LicitacaoStatusBadge.tsx "app/(dashboard)/licitacoes/page.tsx"
git commit -m "feat: add licitacao status badge and list page"
```

---

### Task 10: Nova licitação form page

**Files:**
- Create: `app/(dashboard)/licitacoes/nova/page.tsx`

**Interfaces:**
- Consumes: `POST /api/licitacoes` (Task 7).
- Produces: the cadastro page — nothing else in this plan depends on it.

- [ ] **Step 1: Write the page**

```tsx
// app/(dashboard)/licitacoes/nova/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NovaLicitacaoPage() {
  const router = useRouter();
  const [numeroControlePNCP, setNumeroControlePNCP] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const response = await fetch("/api/licitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroControlePNCP }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao cadastrar licitação");
        return;
      }
      const licitacao = await response.json();
      router.push(`/licitacoes/${licitacao.id}`);
    } catch {
      setErro("Erro ao cadastrar licitação — verifique sua conexão");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Nova Licitação</h1>

      <form onSubmit={cadastrar} className="space-y-3">
        <label className="block text-sm">
          Número de Controle PNCP
          <input
            type="text"
            placeholder="Ex: 01612441000107-1-000131/2026"
            value={numeroControlePNCP}
            onChange={(e) => setNumeroControlePNCP(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Copie esse código da página da licitação no portal do PNCP (pncp.gov.br)
          </span>
        </label>

        {erro && <p className="text-sm text-rosa">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="rounded bg-ciano px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Cadastrar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Verify manually**

Run: `npm run dev` on an unused port (not 3000), log in, navigate to `/licitacoes/nova`. Paste a real, currently-live Número de Controle PNCP (find one via `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=<8-digit-date>&dataFinal=<8-digit-date>&codigoModalidadeContratacao=6&pagina=1&tamanhoPagina=10` if needed — build `numeroControlePNCP` as `{cnpj}-{poder, use 1}-{sequencialCompra padded to 6 digits}/{anoCompra}` from that response's `orgaoEntidade.cnpj`/`sequencialCompra`/`anoCompra`), submit, confirm it navigates to the new licitação's detail page (Task 11's page — a temporary 404 is expected until Task 11 is done; that's fine, confirm the POST succeeded and the URL is correct). Also confirm submitting an invalid format shows an inline error without navigating away.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/licitacoes/nova/page.tsx"
git commit -m "feat: add nova licitacao form page"
```

---

### Task 11: Detail page

**Files:**
- Create: `app/(dashboard)/licitacoes/[id]/page.tsx`, `app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx`

**Interfaces:**
- Consumes: `buscarLicitacao` (`lib/services/licitacaoService.ts`, Task 5), `LicitacaoStatusBadge` (Task 9), `STATUS_INTERNO_LICITACAO` (`lib/services/licitacaoCalculo.ts`, Task 2), `PUT /api/licitacoes/[id]` (Task 7), `POST /api/licitacoes/[id]/atualizar` (Task 8), `DELETE /api/licitacoes/[id]` (Task 7).
- Produces: the finished detail screen — nothing else in this plan depends on it. This is the final task of this plan.

- [ ] **Step 1: Write `app/(dashboard)/licitacoes/[id]/page.tsx`**

```tsx
// app/(dashboard)/licitacoes/[id]/page.tsx
import { notFound } from "next/navigation";
import { buscarLicitacao } from "@/lib/services/licitacaoService";
import { NotFoundError } from "@/lib/errors";
import LicitacaoDetalheClient from "./LicitacaoDetalheClient";

export default async function LicitacaoDetalhePage({ params }: { params: { id: string } }) {
  let licitacao;
  try {
    licitacao = await buscarLicitacao(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <LicitacaoDetalheClient
      id={licitacao.id}
      numeroControlePNCP={licitacao.numeroControlePNCP}
      numeroCompra={licitacao.numeroCompra}
      orgaoNome={licitacao.orgaoNome}
      unidadeNome={licitacao.unidadeNome}
      objetoCompra={licitacao.objetoCompra}
      modalidadeNome={licitacao.modalidadeNome}
      situacaoCompraNome={licitacao.situacaoCompraNome}
      valorTotalEstimado={licitacao.valorTotalEstimado}
      valorTotalHomologado={licitacao.valorTotalHomologado}
      dataAberturaProposta={licitacao.dataAberturaProposta ? licitacao.dataAberturaProposta.toISOString() : null}
      dataEncerramentoProposta={
        licitacao.dataEncerramentoProposta ? licitacao.dataEncerramentoProposta.toISOString() : null
      }
      dataAtualizacaoPNCP={licitacao.dataAtualizacaoPNCP.toISOString()}
      statusInterno={licitacao.statusInterno}
      valorProposta={licitacao.valorProposta}
      responsavel={licitacao.responsavel ?? ""}
      observacoes={licitacao.observacoes ?? ""}
    />
  );
}
```

- [ ] **Step 2: Write `app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx`**

```tsx
// app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LicitacaoStatusBadge from "@/components/LicitacaoStatusBadge";
import { STATUS_INTERNO_LICITACAO } from "@/lib/services/licitacaoCalculo";

interface LicitacaoDetalheClientProps {
  id: string;
  numeroControlePNCP: string;
  numeroCompra: string;
  orgaoNome: string;
  unidadeNome: string;
  objetoCompra: string;
  modalidadeNome: string;
  situacaoCompraNome: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  dataAtualizacaoPNCP: string;
  statusInterno: string;
  valorProposta: number | null;
  responsavel: string;
  observacoes: string;
}

const LABELS_STATUS: Record<string, string> = {
  ANALISANDO: "Analisando",
  VAMOS_PARTICIPAR: "Vamos participar",
  PROPOSTA_ENVIADA: "Proposta enviada",
  GANHAMOS: "Ganhamos",
  PERDEMOS: "Perdemos",
  DESISTIMOS: "Desistimos",
};

export default function LicitacaoDetalheClient({
  id,
  numeroControlePNCP,
  numeroCompra,
  orgaoNome,
  unidadeNome,
  objetoCompra,
  modalidadeNome,
  situacaoCompraNome,
  valorTotalEstimado,
  valorTotalHomologado,
  dataAberturaProposta,
  dataEncerramentoProposta,
  dataAtualizacaoPNCP: dataAtualizacaoPNCPInicial,
  statusInterno: statusInternoInicial,
  valorProposta: valorPropostaInicial,
  responsavel: responsavelInicial,
  observacoes: observacoesInicial,
}: LicitacaoDetalheClientProps) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dataAtualizacaoPNCP, setDataAtualizacaoPNCP] = useState(dataAtualizacaoPNCPInicial);
  const [statusInterno, setStatusInterno] = useState(statusInternoInicial);
  const [valorProposta, setValorProposta] = useState(valorPropostaInicial?.toString() ?? "");
  const [responsavel, setResponsavel] = useState(responsavelInicial);
  const [observacoes, setObservacoes] = useState(observacoesInicial);

  async function atualizarDoPNCP() {
    setErro("");
    setCarregando(true);
    try {
      const response = await fetch(`/api/licitacoes/${id}/atualizar`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao atualizar dados do PNCP");
        return;
      }
      router.refresh();
      const data = await response.json();
      setDataAtualizacaoPNCP(data.dataAtualizacaoPNCP);
    } catch {
      setErro("Erro ao atualizar dados do PNCP — verifique sua conexão");
    } finally {
      setCarregando(false);
    }
  }

  async function salvarDadosInternos(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const response = await fetch(`/api/licitacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusInterno,
          valorProposta: valorProposta === "" ? null : Number(valorProposta),
          responsavel: responsavel || null,
          observacoes: observacoes || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao salvar");
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro ao salvar — verifique sua conexão");
    }
  }

  async function excluir() {
    setErro("");
    try {
      const response = await fetch(`/api/licitacoes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao excluir");
        return;
      }
      router.push("/licitacoes");
    } catch {
      setErro("Erro ao excluir — verifique sua conexão");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Licitação {numeroCompra}</h1>
        <LicitacaoStatusBadge statusInterno={statusInterno} dataEncerramentoProposta={dataEncerramentoProposta} />
      </div>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <div className="mb-6 rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-marinho">Dados do PNCP</h2>
          <button
            type="button"
            disabled={carregando}
            onClick={atualizarDoPNCP}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Atualizar
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Número de Controle PNCP</dt>
            <dd>{numeroControlePNCP}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Órgão</dt>
            <dd>{orgaoNome}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unidade</dt>
            <dd>{unidadeNome}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Modalidade</dt>
            <dd>{modalidadeNome}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Objeto</dt>
            <dd>{objetoCompra}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Situação no PNCP</dt>
            <dd>{situacaoCompraNome}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Valor estimado</dt>
            <dd>{valorTotalEstimado != null ? `R$ ${valorTotalEstimado.toFixed(2)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Valor homologado</dt>
            <dd>{valorTotalHomologado != null ? `R$ ${valorTotalHomologado.toFixed(2)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Abertura da proposta</dt>
            <dd>{dataAberturaProposta ? new Date(dataAberturaProposta).toLocaleString("pt-BR") : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Encerramento da proposta</dt>
            <dd>
              {dataEncerramentoProposta ? new Date(dataEncerramentoProposta).toLocaleString("pt-BR") : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-400">
          Atualizado em {new Date(dataAtualizacaoPNCP).toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold text-marinho">Controle interno</h2>
        <form onSubmit={salvarDadosInternos} className="max-w-sm space-y-3">
          <label className="block text-sm">
            Status
            <select
              value={statusInterno}
              onChange={(e) => setStatusInterno(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {STATUS_INTERNO_LICITACAO.map((status) => (
                <option key={status} value={status}>
                  {LABELS_STATUS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Valor da proposta
            <input
              type="number"
              value={valorProposta}
              onChange={(e) => setValorProposta(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Responsável
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
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

      <button type="button" onClick={excluir} className="text-sm text-rosa underline">
        Excluir licitação
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run the full suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 5: Verify manually**

Run: `npm run dev` on an unused port (not 3000), log in, open the detail page for a licitação created earlier (via `/licitacoes` list or directly):
- Confirm all the PNCP data fields render correctly.
- Click "Atualizar", confirm the "Atualizado em" timestamp changes and any refreshed field (e.g. `situacaoCompraNome`, if it changed on the real PNCP side — it may not have, that's fine) still displays correctly.
- Change the status to "Vamos participar", fill in valor da proposta/responsável/observações, save, confirm it persists after a page refresh.
- Click "Excluir licitação", confirm it navigates back to `/licitacoes` and the licitação no longer appears in the list.

Show real observed detail (actual id used, actual field values seen) in your report.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/licitacoes/[id]/page.tsx" "app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx"
git commit -m "feat: add licitacao detail page"
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

**Navigation note:** `components/layout/Sidebar.tsx` already has a `{ href: "/licitacoes", label: "Licitações" }` entry (registered since sub-project 1's placeholder shell) — no new task needed to wire up navigation.
