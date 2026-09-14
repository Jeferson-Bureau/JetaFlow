import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";

describe("alocarProximoNumero", () => {
  beforeEach(async () => {
    await prisma.numeracaoDocumento.upsert({
      where: { tipoDocumento: "ORCAMENTO" },
      update: { prefixo: "ORC", proximoNumero: 1, digitos: 4 },
      create: { tipoDocumento: "ORCAMENTO", prefixo: "ORC", proximoNumero: 1, digitos: 4 },
    });
  });

  it("allocates the current number and increments the counter", async () => {
    const primeiro = await alocarProximoNumero("ORCAMENTO");
    expect(primeiro).toBe("ORC0001");

    const segundo = await alocarProximoNumero("ORCAMENTO");
    expect(segundo).toBe("ORC0002");
  });

  it("pads the number to the configured number of digits", async () => {
    await prisma.numeracaoDocumento.update({
      where: { tipoDocumento: "ORCAMENTO" },
      data: { proximoNumero: 99, digitos: 3 },
    });
    const numero = await alocarProximoNumero("ORCAMENTO");
    expect(numero).toBe("ORC099");
  });
});
