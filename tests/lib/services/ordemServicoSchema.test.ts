import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("OrdemServico schema", () => {
  it("creates an OrdemServico linked to an APROVADO orcamento", async () => {
    const cliente = await prisma.cliente.create({
      data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
    });
    const orcamento = await prisma.orcamento.create({
      data: { numero: "ORC0001", clienteId: cliente.id, validadeDias: 15, status: "APROVADO" },
    });

    const os = await prisma.ordemServico.create({
      data: { numero: "OS0001", orcamentoId: orcamento.id },
    });

    expect(os.estagio).toBe("ARQUIVO_RECEBIDO");
    expect(os.prazoEntrega).toBeNull();

    const orcamentoComOS = await prisma.orcamento.findUniqueOrThrow({
      where: { id: orcamento.id },
      include: { ordemServico: true },
    });
    expect(orcamentoComOS.ordemServico?.id).toBe(os.id);
  });
});
