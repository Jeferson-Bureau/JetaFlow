import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Licitacao schema", () => {
  it("creates a Licitacao with the expected defaults", async () => {
    const licitacao = await prisma.licitacao.create({
      data: {
        numeroControlePNCP: "01612441000107-1-000131/2026",
        cnpjOrgao: "01612441000107",
        anoCompra: 2026,
        sequencialCompra: 131,
        orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA",
        unidadeNome: "Prefeitura Municipal de Bela Vista da Caroba",
        numeroCompra: "PR53",
        objetoCompra: "Contratação de licença de uso de software",
        modalidadeNome: "Pregão - Eletrônico",
        situacaoCompraNome: "Divulgada no PNCP",
        dataAtualizacaoPNCP: new Date(),
      },
    });

    expect(licitacao.statusInterno).toBe("ANALISANDO");
    expect(licitacao.valorProposta).toBeNull();
    expect(licitacao.responsavel).toBeNull();
  });

  it("enforces uniqueness on numeroControlePNCP", async () => {
    const data = {
      numeroControlePNCP: "01612441000107-1-000131/2026",
      cnpjOrgao: "01612441000107",
      anoCompra: 2026,
      sequencialCompra: 131,
      orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA",
      unidadeNome: "Prefeitura Municipal de Bela Vista da Caroba",
      numeroCompra: "PR53",
      objetoCompra: "Contratação de licença de uso de software",
      modalidadeNome: "Pregão - Eletrônico",
      situacaoCompraNome: "Divulgada no PNCP",
      dataAtualizacaoPNCP: new Date(),
    };
    await prisma.licitacao.create({ data });
    await expect(prisma.licitacao.create({ data })).rejects.toThrow();
  });
});
