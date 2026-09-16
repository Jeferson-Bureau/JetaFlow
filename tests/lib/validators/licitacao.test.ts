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
