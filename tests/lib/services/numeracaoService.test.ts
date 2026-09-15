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

  it("creates the row with the known default prefix for OS when it doesn't exist yet", async () => {
    const numero = await alocarProximoNumero("OS");
    expect(numero).toBe("OS0001");
  });

  it("creates the row with a fallback prefix (the tipoDocumento itself) when no default is known", async () => {
    const numero = await alocarProximoNumero("TIPO_DESCONHECIDO");
    expect(numero).toBe("TIPO_DESCONHECIDO0001");
  });
});
