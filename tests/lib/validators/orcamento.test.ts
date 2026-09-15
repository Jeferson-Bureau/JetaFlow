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

  it("rejects an OFFSET item with chapaId set but chapaQuantidade null", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: "chapa1",
      chapaQuantidade: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an OFFSET item with chapaQuantidade set but chapaId null", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "OFFSET",
      chapaId: null,
      chapaQuantidade: 4,
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

  it("rejects a DIGITAL item with a non-null chapaQuantidade even without chapaId", () => {
    const result = orcamentoItemInputSchema.safeParse({
      ...validItem,
      tipo: "DIGITAL",
      chapaId: null,
      chapaQuantidade: 4,
    });
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
