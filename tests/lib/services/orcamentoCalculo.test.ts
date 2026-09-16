import { describe, it, expect } from "vitest";
import {
  calcularItem,
  calcularCustoAcabamento,
  calcularQuantidadeChapas,
  calcularPrecoFinal,
  type ItemCalculoInput,
} from "@/lib/services/orcamentoCalculo";
import { sugerirAproveitamento, sugerirAproveitamentoDigital } from "@/lib/services/aproveitamentoPapel";

const substrato = { custoUnitario: 10, percentualPerda: 10, markup: 50 };
const equipamento = { velocidade: 10, tempoSetupMin: 15, custoHora: 120, percentualPerda: 5 };
const parametros = {
  custoMaoObraHoraPadrao: 30,
  percentualCustosIndiretosPadrao: 10,
  impostosPercentualPadrao: 0,
  comissaoPercentualPadrao: 0,
  despesasFinanceirasPercentualPadrao: 0,
};

const baseInput: ItemCalculoInput = {
  tipo: "DIGITAL",
  substrato,
  larguraCm: 100,
  alturaCm: 50,
  tiragem: 100,
  equipamento,
  chapa: null,
  coresFrente: null,
  coresVerso: null,
  tinta: null,
  tintaQuantidade: null,
  acabamentoCustoTotal: 20,
  tipoMarkup: "MULTIPLICADOR",
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
      coresFrente: 4,
      coresVerso: 0,
      tinta: { custoUnitario: 30, percentualPerda: 0, markup: 0 },
      tintaQuantidade: 2,
    });
    expect(resultado.custoCalculado).toBeCloseTo(1287, 5);
    expect(resultado.precoFinal).toBeCloseTo(1608.75, 5);
    expect(resultado.chapaQuantidade).toBe(4);
  });

  it("treats an OFFSET item with no chapa/tinta selected the same as a DIGITAL one", () => {
    const resultado = calcularItem({ ...baseInput, tipo: "OFFSET" });
    expect(resultado.custoCalculado).toBeCloseTo(1001, 5);
    expect(resultado.precoFinal).toBeCloseTo(1251.25, 5);
  });

  it("handles zero acabamentoCustoTotal", () => {
    const resultado = calcularItem({ ...baseInput, acabamentoCustoTotal: 0 });
    expect(resultado.custoCalculado).toBeCloseTo(979, 5);
    expect(resultado.precoFinal).toBeCloseTo(1223.75, 5);
  });

  it("rejects a DIGITAL item with chapa set", () => {
    expect(() =>
      calcularItem({
        ...baseInput,
        chapa: { custoUnitario: 50, percentualPerda: 0, markup: 0 },
        coresFrente: 4,
      })
    ).toThrow("Item DIGITAL não pode ter chapa ou tinta");
  });

  it("rejects an OFFSET item with a chapa selected but no coresFrente", () => {
    expect(() =>
      calcularItem({
        ...baseInput,
        tipo: "OFFSET",
        chapa: { custoUnitario: 50, percentualPerda: 0, markup: 0 },
      })
    ).toThrow("Informe as cores da frente para calcular a quantidade de chapas");
  });

  it("returns null chapaQuantidade when no chapa is selected", () => {
    const resultado = calcularItem({ ...baseInput, tipo: "OFFSET" });
    expect(resultado.chapaQuantidade).toBeNull();
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

    it("rejects a folha substrato with no substratoFolhas when no aproveitamento fits", () => {
      expect(() =>
        calcularItem({ ...baseInput, substrato: substratoFolha, substratoFolhas: null })
      ).toThrow("Não foi possível calcular o aproveitamento automaticamente");
    });

    it("rejects a folha substrato with substratoFolhas <= 0 when no aproveitamento fits", () => {
      expect(() =>
        calcularItem({ ...baseInput, substrato: substratoFolha, substratoFolhas: 0 })
      ).toThrow("Não foi possível calcular o aproveitamento automaticamente");
    });

    it("calculates substratoFolhas automatically for DIGITAL from A4/A3/SRA3 aproveitamento", () => {
      const melhor = sugerirAproveitamentoDigital(9, 5, 1000)[0];
      const resultado = calcularItem({
        ...baseInput,
        tipo: "DIGITAL",
        substrato: substratoFolha,
        larguraCm: 9,
        alturaCm: 5,
        tiragem: 1000,
        substratoFolhas: null,
      });
      expect(resultado.substratoFolhas).toBe(melhor.folhasNecessarias);
      const custoSubstratoEsperado = melhor.folhasNecessarias * 2 * 1.1 * 1.5;
      expect(resultado.custoCalculado).toBeGreaterThanOrEqual(custoSubstratoEsperado);
    });

    it("calculates substratoFolhas automatically for OFFSET from the commercial sheet table", () => {
      const melhor = sugerirAproveitamento(9, 5, 1000)[0];
      const resultado = calcularItem({
        ...baseInput,
        tipo: "OFFSET",
        substrato: substratoFolha,
        larguraCm: 9,
        alturaCm: 5,
        tiragem: 1000,
        substratoFolhas: null,
      });
      expect(resultado.substratoFolhas).toBe(melhor.folhasNecessarias);
    });

    it("uses an explicit substratoFolhas as a manual override even when an aproveitamento would fit", () => {
      const resultado = calcularItem({
        ...baseInput,
        substrato: substratoFolha,
        larguraCm: 9,
        alturaCm: 5,
        tiragem: 1000,
        substratoFolhas: 40,
      });
      expect(resultado.substratoFolhas).toBe(40);
    });

    it("returns null substratoFolhas for area-based substrates", () => {
      const resultado = calcularItem(baseInput);
      expect(resultado.substratoFolhas).toBeNull();
    });
  });
});

describe("calcularQuantidadeChapas", () => {
  it("sums coresFrente and coresVerso", () => {
    expect(calcularQuantidadeChapas(4, 4)).toBe(8);
  });

  it("treats a missing coresVerso as 0 (frente only)", () => {
    expect(calcularQuantidadeChapas(4, null)).toBe(4);
  });

  it("returns 0 when both are missing", () => {
    expect(calcularQuantidadeChapas(null, null)).toBe(0);
  });
});

describe("calcularCustoAcabamento", () => {
  it("uses valorFixo with perda applied for tipoCalculo FIXO", () => {
    const custo = calcularCustoAcabamento(
      { acabamento: { tipoCalculo: "FIXO", valorFixo: 150, valorPorUnidade: null, percentualPerda: 10 } },
      100
    );
    expect(custo).toBeCloseTo(165, 5);
  });

  it("defaults quantidade to tiragem for tipoCalculo POR_UNIDADE", () => {
    const custo = calcularCustoAcabamento(
      { acabamento: { tipoCalculo: "POR_UNIDADE", valorFixo: null, valorPorUnidade: 0.1, percentualPerda: 0 } },
      100
    );
    expect(custo).toBeCloseTo(10, 5);
  });

  it("uses an explicit quantidade override for tipoCalculo POR_UNIDADE", () => {
    const custo = calcularCustoAcabamento(
      {
        acabamento: { tipoCalculo: "POR_UNIDADE", valorFixo: null, valorPorUnidade: 0.1, percentualPerda: 0 },
        quantidade: 50,
      },
      100
    );
    expect(custo).toBeCloseTo(5, 5);
  });

  it("uses valorAvulso directly when no acabamento is given", () => {
    const custo = calcularCustoAcabamento({ valorAvulso: 42 }, 100);
    expect(custo).toBe(42);
  });

  it("returns 0 when neither acabamento nor valorAvulso is given", () => {
    const custo = calcularCustoAcabamento({}, 100);
    expect(custo).toBe(0);
  });
});

describe("calcularPrecoFinal", () => {
  const parametrosDivisor = {
    custoMaoObraHoraPadrao: 0,
    percentualCustosIndiretosPadrao: 0,
    impostosPercentualPadrao: 10,
    comissaoPercentualPadrao: 5,
    despesasFinanceirasPercentualPadrao: 2,
  };

  it("uses cost x (1 + margem) for MULTIPLICADOR", () => {
    expect(calcularPrecoFinal(1000, "MULTIPLICADOR", 25, parametrosDivisor)).toBeCloseTo(1250, 5);
  });

  it("matches the spec example for DIVISOR (custo 1000, impostos 10%, comissão 5%, despesas 2%, lucro 15%)", () => {
    expect(calcularPrecoFinal(1000, "DIVISOR", 15, parametrosDivisor)).toBeCloseTo(1470.5882353, 5);
  });

  it("throws when the divisor percentuais sum to 100% or more", () => {
    expect(() => calcularPrecoFinal(1000, "DIVISOR", 83, parametrosDivisor)).toThrow("Markup divisor inválido");
  });
});
