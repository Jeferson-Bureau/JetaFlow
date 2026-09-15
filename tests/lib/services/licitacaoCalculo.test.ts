import { describe, it, expect } from "vitest";
import { STATUS_INTERNO_LICITACAO, propostaEncerrada } from "@/lib/services/licitacaoCalculo";

describe("STATUS_INTERNO_LICITACAO", () => {
  it("has the 6 statuses in the expected order", () => {
    expect(STATUS_INTERNO_LICITACAO).toEqual([
      "ANALISANDO", "VAMOS_PARTICIPAR", "PROPOSTA_ENVIADA",
      "GANHAMOS", "PERDEMOS", "DESISTIMOS",
    ]);
  });
});

describe("propostaEncerrada", () => {
  it("is false when there is no dataEncerramentoProposta", () => {
    expect(propostaEncerrada(null)).toBe(false);
  });

  it("is false when dataEncerramentoProposta is in the future", () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(propostaEncerrada(amanha)).toBe(false);
  });

  it("is true when dataEncerramentoProposta is in the past", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(propostaEncerrada(ontem)).toBe(true);
  });
});
