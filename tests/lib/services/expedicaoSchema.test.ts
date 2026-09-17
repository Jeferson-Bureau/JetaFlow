import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Expedicao/Volume schema", () => {
  it("creates an Expedicao with Volume rows linked to an OrdemServico", async () => {
    const cliente = await prisma.cliente.create({
      data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
    });
    const orcamento = await prisma.orcamento.create({
      data: { numero: "ORC0001", clienteId: cliente.id, validadeDias: 15, status: "APROVADO" },
    });
    const os = await prisma.ordemServico.create({
      data: { numero: "OS0001", orcamentoId: orcamento.id },
    });

    const expedicao = await prisma.expedicao.create({
      data: {
        ordemServicoId: os.id,
        cidade: "São Paulo",
        volumes: {
          create: [
            { numero: 1, codigoInterno: "OS0001-01", quantidade: 5 },
            { numero: 2, codigoInterno: "OS0001-02", quantidade: 5 },
          ],
        },
      },
      include: { volumes: true },
    });

    expect(expedicao.volumes).toHaveLength(2);
    expect(expedicao.volumes[0].conferido).toBe(false);

    const osComExpedicao = await prisma.ordemServico.findUniqueOrThrow({
      where: { id: os.id },
      include: { expedicao: true },
    });
    expect(osComExpedicao.expedicao?.id).toBe(expedicao.id);
  });
});
