import { describe, it, expect } from "vitest";
import {
  gerarCodigoInterno, calcularProgressoConferencia, calcularDivergenciasPorItem,
} from "@/lib/services/expedicaoCalculo";

describe("gerarCodigoInterno", () => {
  it("pads single-digit volume numbers to 2 digits", () => {
    expect(gerarCodigoInterno("OS0001", 1)).toBe("OS0001-01");
    expect(gerarCodigoInterno("OS0001", 9)).toBe("OS0001-09");
  });

  it("does not truncate two-or-more-digit volume numbers", () => {
    expect(gerarCodigoInterno("OS0001", 10)).toBe("OS0001-10");
    expect(gerarCodigoInterno("OS0001", 123)).toBe("OS0001-123");
  });
});

describe("calcularProgressoConferencia", () => {
  it("counts conferred volumes out of the total", () => {
    expect(calcularProgressoConferencia([])).toEqual({ conferidos: 0, total: 0 });
    expect(
      calcularProgressoConferencia([{ conferido: true }, { conferido: false }, { conferido: true }])
    ).toEqual({ conferidos: 2, total: 3 });
  });
});

describe("calcularDivergenciasPorItem", () => {
  const itens = [
    { id: "item-1", descricao: "Banner", tiragem: 100 },
    { id: "item-2", descricao: "Panfleto", tiragem: 500 },
  ];

  it("sums volume quantities per item and flags no divergence when they match", () => {
    const volumes = [
      { orcamentoItemId: "item-1", quantidade: 60 },
      { orcamentoItemId: "item-1", quantidade: 40 },
      { orcamentoItemId: "item-2", quantidade: 500 },
    ];

    const resultado = calcularDivergenciasPorItem(itens, volumes);

    expect(resultado).toEqual([
      { orcamentoItemId: "item-1", descricao: "Banner", tiragem: 100, somaVolumes: 100, divergente: false },
      { orcamentoItemId: "item-2", descricao: "Panfleto", tiragem: 500, somaVolumes: 500, divergente: false },
    ]);
  });

  it("flags divergence when the sum of volumes doesn't match the tiragem", () => {
    const volumes = [{ orcamentoItemId: "item-1", quantidade: 90 }];

    const resultado = calcularDivergenciasPorItem(itens, volumes);

    expect(resultado[0]).toMatchObject({ somaVolumes: 90, divergente: true });
    expect(resultado[1]).toMatchObject({ somaVolumes: 0, divergente: true });
  });

  it("ignores volumes linked to a different item", () => {
    const volumes = [{ orcamentoItemId: "item-2", quantidade: 500 }];

    const resultado = calcularDivergenciasPorItem(itens, volumes);

    expect(resultado[0]).toMatchObject({ somaVolumes: 0, divergente: true });
  });
});
