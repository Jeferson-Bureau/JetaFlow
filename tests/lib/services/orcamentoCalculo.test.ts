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

  describe("substrato com unidadeMedida folha", () => {
    const substratoFolha = { custoUnitario: 2, percentualPerda: 10, markup: 50, unidadeMedida: "folha" };

    it("prices by substratoFolhas instead of area", () => {
      const resultado = calcularItem({ ...baseInput, substrato: substratoFolha, substratoFolhas: 20 });
      // custoSubstrato = 20 * 2 * 1.10 * 1.50 = 66 (em vez de área*tiragem*custoUnitario)
      expect(resultado.custoCalculado).toBeCloseTo(166.1, 5);
      expect(resultado.precoFinal).toBeCloseTo(207.625, 5);
    });

    it("rejects a folha substrato with no substratoFolhas", () => {
      expect(() =>
        calcularItem({ ...baseInput, substrato: substratoFolha, substratoFolhas: null })
      ).toThrow("Quantidade de folhas obrigatória para papel");
    });

    it("rejects a folha substrato with substratoFolhas <= 0", () => {
      expect(() =>
        calcularItem({ ...baseInput, substrato: substratoFolha, substratoFolhas: 0 })
      ).toThrow("Quantidade de folhas obrigatória para papel");
    });
  });
});
