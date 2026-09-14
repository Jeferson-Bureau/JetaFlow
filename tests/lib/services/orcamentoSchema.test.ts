import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Orcamento schema", () => {
  it("creates an Orcamento with a nested OrcamentoItem", async () => {
    const cliente = await prisma.cliente.create({
      data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
    });
    const substrato = await prisma.substrato.create({
      data: {
        nome: "Papel Couché", tipo: "PAPEL", unidadeMedida: "m2",
        custoUnitario: 10, atributos: "{}",
      },
    });
    const equipamento = await prisma.equipamento.create({
      data: {
        nome: "Xerox AltaLink", tipo: "DIGITAL", velocidade: 10,
        unidadeVelocidade: "unidades/min", formatoMaximo: "A3",
        custoHora: 120, tempoSetupMin: 15, acabamentosSuportados: "[]",
      },
    });

    const orcamento = await prisma.orcamento.create({
      data: {
        numero: "ORC0001",
        clienteId: cliente.id,
        validadeDias: 15,
        itens: {
          create: [
            {
              descricao: "Cartão de visita",
              tipo: "DIGITAL",
              substratoId: substrato.id,
              larguraCm: 100,
              alturaCm: 50,
              tiragem: 100,
              equipamentoId: equipamento.id,
              acabamentoCusto: 20,
              margemLucro: 25,
              custoCalculado: 1001,
              precoFinal: 1251.25,
              ordem: 0,
            },
          ],
        },
      },
      include: { itens: true },
    });

    expect(orcamento.status).toBe("RASCUNHO");
    expect(orcamento.itens).toHaveLength(1);
    expect(orcamento.itens[0].precoFinal).toBe(1251.25);
  });
});
