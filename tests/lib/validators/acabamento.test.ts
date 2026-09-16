import { describe, it, expect } from "vitest";
import { acabamentoSchema } from "@/lib/validators/acabamento";

const fixo = {
  nome: "Hot stamping", categoria: "HOT_STAMPING", tipoCalculo: "FIXO",
  valorFixo: 150, percentualPerda: 0, ativo: true,
};

const porUnidade = {
  nome: "Grampeamento", categoria: "GRAMPEAMENTO", tipoCalculo: "POR_UNIDADE",
  valorPorUnidade: 0.05, percentualPerda: 2, ativo: true,
};

describe("acabamentoSchema", () => {
  it("accepts a valid FIXO acabamento", () => {
    expect(acabamentoSchema.safeParse(fixo).success).toBe(true);
  });

  it("accepts a valid POR_UNIDADE acabamento", () => {
    expect(acabamentoSchema.safeParse(porUnidade).success).toBe(true);
  });

  it("rejects FIXO without valorFixo", () => {
    const { valorFixo, ...rest } = fixo;
    const result = acabamentoSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("valorFixo"))).toBe(true);
    }
  });

  it("rejects POR_UNIDADE without valorPorUnidade", () => {
    const { valorPorUnidade, ...rest } = porUnidade;
    const result = acabamentoSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("valorPorUnidade"))).toBe(true);
    }
  });

  it("rejects an invalid categoria", () => {
    const result = acabamentoSchema.safeParse({ ...fixo, categoria: "INVALIDA" });
    expect(result.success).toBe(false);
  });

  it("rejects percentualPerda above 100", () => {
    const result = acabamentoSchema.safeParse({ ...fixo, percentualPerda: 150 });
    expect(result.success).toBe(false);
  });

  it("defaults ativo to true and percentualPerda to 0 when omitted", () => {
    const { percentualPerda, ativo, ...rest } = fixo;
    const result = acabamentoSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ativo).toBe(true);
      expect(result.data.percentualPerda).toBe(0);
    }
  });
});
