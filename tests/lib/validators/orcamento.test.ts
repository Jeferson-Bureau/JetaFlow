import { describe, it, expect } from "vitest";
import {
  orcamentoInputSchema,
  orcamentoItemInputSchema,
  orcamentoItemAcabamentoInputSchema,
} from "@/lib/validators/orcamento";

const validItem = {
  descricao: "Cartão de visita",
  tipo: "DIGITAL" as const,
  substratoId: "sub1",
  larguraCm: 100,
  alturaCm: 50,
  tiragem: 100,
  equipamentoId: "equip1",
  acabamentos: [],
  margemLucro: 25,
};

describe("orcamentoItemInputSchema", () => {
  it("accepts a valid DIGITAL item", () => {
    expect(orcamentoItemInputSchema.safeParse(validItem).success).toBe(true);
  });

  it("defaults tipoMarkup to MULTIPLICADOR when omitted", () => {
    const result = orcamentoItemInputSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tipoMarkup).toBe("MULTIPLICADOR");
  });

  it("accepts tipoMarkup DIVISOR", () => {
    const result = orcamentoItemInputSchema.safeParse({ ...validItem, tipoMarkup: "DIVISOR" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid tipoMarkup", () => {
    const result = orcamentoItemInputSchema.safeParse({ ...validItem, tipoMarkup: "OUTRO" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid OFFSET item with chapa/tinta", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: "chapa1",
      coresFrente: 4,
      coresVerso: 0,
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

  it("rejects an OFFSET item with chapaId set but coresFrente null", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: "chapa1",
      coresFrente: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an OFFSET item with coresFrente set but chapaId null", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: null,
      coresFrente: 4,
    });
    expect(result.success).toBe(false);
  });

  it("accepts an OFFSET item with coresVerso 0 (frente only)", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: "chapa1",
      coresFrente: 4,
      coresVerso: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects coresVerso set without chapaId", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      coresVerso: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an OFFSET item with tintaId set but tintaQuantidade null", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      tintaId: "tinta1",
      tintaQuantidade: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an OFFSET item with tintaQuantidade set but tintaId null", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      tintaId: null,
      tintaQuantidade: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a DIGITAL item with a non-null coresFrente even without chapaId", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "DIGITAL",
      chapaId: null,
      coresFrente: 4,
    });
    expect(result.success).toBe(false);
  });
});

describe("orcamentoItemAcabamentoInputSchema", () => {
  it("accepts a catálogo acabamento", () => {
    const result = orcamentoItemAcabamentoInputSchema.safeParse({ acabamentoId: "ac1" });
    expect(result.success).toBe(true);
  });

  it("accepts an avulso acabamento with valorAvulso", () => {
    const result = orcamentoItemAcabamentoInputSchema.safeParse({
      descricaoAvulsa: "Hot stamping dourado", valorAvulso: 80,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither acabamentoId nor descricaoAvulsa is set", () => {
    const result = orcamentoItemAcabamentoInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects when both acabamentoId and descricaoAvulsa are set", () => {
    const result = orcamentoItemAcabamentoInputSchema.safeParse({
      acabamentoId: "ac1", descricaoAvulsa: "Avulso", valorAvulso: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an avulso acabamento without valorAvulso", () => {
    const result = orcamentoItemAcabamentoInputSchema.safeParse({ descricaoAvulsa: "Sem valor" });
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
