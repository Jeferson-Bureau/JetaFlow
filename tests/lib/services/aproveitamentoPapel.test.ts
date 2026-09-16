import { describe, it, expect } from "vitest";
import { sugerirAproveitamento, sugerirAproveitamentoDigital } from "@/lib/services/aproveitamentoPapel";

describe("sugerirAproveitamento", () => {
  it("finds an exact match from the table and computes folhas needed", () => {
    const resultados = sugerirAproveitamento(33, 50, 1000);
    const melhor = resultados[0];
    expect(melhor.corte.pecas).toBeGreaterThanOrEqual(2);
    expect(melhor.folhasNecessarias).toBe(Math.ceil(1000 / melhor.corte.pecas));
  });

  it("matches a piece rotated 90 degrees", () => {
    // 50 x 33 is the 33 x 50 cut from the 50x66 sheet, rotated
    const resultados = sugerirAproveitamento(50, 33, 100);
    expect(resultados.length).toBeGreaterThan(0);
  });

  it("returns the best-yield (most pecas) candidate first", () => {
    const resultados = sugerirAproveitamento(10, 15, 500);
    for (let i = 1; i < resultados.length; i++) {
      expect(resultados[i - 1].corte.pecas).toBeGreaterThanOrEqual(resultados[i].corte.pecas);
    }
  });

  it("returns an empty array when nothing in the table fits", () => {
    const resultados = sugerirAproveitamento(200, 300, 100);
    expect(resultados).toEqual([]);
  });

  it("returns an empty array for invalid dimensions or tiragem", () => {
    expect(sugerirAproveitamento(0, 50, 100)).toEqual([]);
    expect(sugerirAproveitamento(33, 0, 100)).toEqual([]);
    expect(sugerirAproveitamento(33, 50, 0)).toEqual([]);
  });

  it("computes folhasNecessarias as a ceiling of tiragem / pecas", () => {
    const resultados = sugerirAproveitamento(11, 16, 33);
    const doisFolhasComTiragem33 = resultados.find((r) => r.corte.pecas === 32);
    expect(doisFolhasComTiragem33?.folhasNecessarias).toBe(2);
  });
});

describe("sugerirAproveitamentoDigital", () => {
  it("picks the best fit among A4, A3 and SRA3 (grade simples, com rotação)", () => {
    const resultados = sugerirAproveitamentoDigital(9, 5, 1000);
    expect(resultados[0].formatoPai).toEqual({ larguraCm: 32, alturaCm: 45 });
    expect(resultados[0].corte.pecas).toBe(30);
    expect(resultados[0].folhasNecessarias).toBe(34);
  });

  it("returns candidates sorted by best yield (most pecas) first", () => {
    const resultados = sugerirAproveitamentoDigital(9, 5, 1000);
    for (let i = 1; i < resultados.length; i++) {
      expect(resultados[i - 1].corte.pecas).toBeGreaterThanOrEqual(resultados[i].corte.pecas);
    }
  });

  it("returns an empty array when the piece doesn't fit any digital format", () => {
    const resultados = sugerirAproveitamentoDigital(50, 50, 10);
    expect(resultados).toEqual([]);
  });

  it("returns an empty array for invalid dimensions or tiragem", () => {
    expect(sugerirAproveitamentoDigital(0, 5, 100)).toEqual([]);
    expect(sugerirAproveitamentoDigital(9, 0, 100)).toEqual([]);
    expect(sugerirAproveitamentoDigital(9, 5, 0)).toEqual([]);
  });
});
