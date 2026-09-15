import { describe, it, expect } from "vitest";
import { gerarCodigoInterno, calcularProgressoConferencia } from "@/lib/services/expedicaoCalculo";

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
