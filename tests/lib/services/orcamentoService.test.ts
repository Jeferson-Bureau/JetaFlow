import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarOrcamento,
  listarOrcamentos,
  buscarOrcamento,
  atualizarOrcamento,
} from "@/lib/services/orcamentoService";

async function seedCatalogo() {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento: "ORCAMENTO" },
    update: { prefixo: "ORC", proximoNumero: 1, digitos: 4 },
    create: { tipoDocumento: "ORCAMENTO", prefixo: "ORC", proximoNumero: 1, digitos: 4 },
  });
  await prisma.parametroCalculo.upsert({
    where: { id: 1 },
    update: { margemLucroPadrao: 25, custoMaoObraHoraPadrao: 30, percentualCustosIndiretosPadrao: 10 },
    create: {
      id: 1, margemLucroPadrao: 25, custoMaoObraHoraPadrao: 30,
      percentualCustosIndiretosPadrao: 10, validadePadraoDias: 15,
    },
  });
  const cliente = await prisma.cliente.create({
    data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
  });
  const substrato = await prisma.substrato.create({
    data: { nome: "Papel Couché", tipo: "PAPEL", unidadeMedida: "m2", custoUnitario: 10, percentualPerda: 10, markup: 50, atributos: "{}" },
  });
  const equipamento = await prisma.equipamento.create({
    data: { nome: "Xerox AltaLink", tipo: "DIGITAL", velocidade: 10, unidadeVelocidade: "unidades/min", formatoMaximo: "A3", custoHora: 120, tempoSetupMin: 15, percentualPerda: 5, acabamentosSuportados: "[]" },
  });
  return { cliente, substrato, equipamento };
}

describe("orcamentoService", () => {
  let seed: Awaited<ReturnType<typeof seedCatalogo>>;

  beforeEach(async () => {
    seed = await seedCatalogo();
  });

  it("creates an orcamento with a computed price and an allocated numero", async () => {
    const orcamento = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [
        {
          descricao: "Cartão de visita",
          tipo: "DIGITAL",
          substratoId: seed.substrato.id,
          larguraCm: 100,
          alturaCm: 50,
          tiragem: 100,
          equipamentoId: seed.equipamento.id,
          acabamentoCusto: 20,
          margemLucro: 25,
        },
      ],
    });

    expect(orcamento.numero).toBe("ORC0001");
    expect(orcamento.status).toBe("RASCUNHO");
    expect(orcamento.validadeDias).toBe(15);
    expect(orcamento.itens[0].precoFinal).toBeCloseTo(1251.25, 5);
  });

  it("lists and searches by cliente nome", async () => {
    await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 }],
    });
    const resultados = await listarOrcamentos("Cliente Teste");
    expect(resultados).toHaveLength(1);
    const vazio = await listarOrcamentos("Nome Que Não Existe");
    expect(vazio).toHaveLength(0);
  });

  it("throws NotFoundError for a missing orcamento", async () => {
    await expect(buscarOrcamento("id-inexistente")).rejects.toThrow("Não encontrado");
  });

  it("updates an orcamento's itens, recomputing prices server-side", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id, acabamentoCusto: 20, margemLucro: 25 }],
    });

    const atualizado = await atualizarOrcamento(criado.id, {
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item editado", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 25 }],
    });

    expect(atualizado.itens[0].descricao).toBe("Item editado");
    expect(atualizado.itens[0].precoFinal).toBeCloseTo(1223.75, 5);
  });

  it("rejects updating an APROVADO orcamento", async () => {
    const itemInput = { descricao: "Item", tipo: "DIGITAL" as const, substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentoCusto: 0, margemLucro: 0 };
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [itemInput],
    });
    await prisma.orcamento.update({ where: { id: criado.id }, data: { status: "APROVADO" } });

    await expect(
      atualizarOrcamento(criado.id, { clienteId: seed.cliente.id, itens: [itemInput] })
    ).rejects.toThrow("Acesso negado");
  });
});
