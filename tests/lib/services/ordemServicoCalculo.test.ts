import { describe, it, expect } from "vitest";
import { ESTAGIOS_OS, estaAtrasada } from "@/lib/services/ordemServicoCalculo";

describe("ESTAGIOS_OS", () => {
  it("has the 8 stages in the correct order", () => {
    expect(ESTAGIOS_OS).toEqual([
      "ARQUIVO_RECEBIDO", "PRE_IMPRESSAO", "PRODUCAO", "ACABAMENTO",
      "CONFERENCIA", "EMBALAGEM", "EXPEDICAO", "CONCLUIDO",
    ]);
  });
});

describe("estaAtrasada", () => {
  it("is false when there is no prazoEntrega", () => {
    expect(estaAtrasada("PRODUCAO", null)).toBe(false);
  });

  it("is false when prazoEntrega is in the future", () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(estaAtrasada("PRODUCAO", amanha)).toBe(false);
  });

  it("is true when prazoEntrega is in the past and estagio is not CONCLUIDO", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(estaAtrasada("PRODUCAO", ontem)).toBe(true);
  });

  it("is false when prazoEntrega is in the past but estagio is CONCLUIDO", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(estaAtrasada("CONCLUIDO", ontem)).toBe(false);
  });

  it("is false when prazoEntrega is today (not yet past end of day)", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    expect(estaAtrasada("PRODUCAO", hoje)).toBe(false);
  });
});
