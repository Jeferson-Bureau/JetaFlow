import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarOrcamento,
  listarOrcamentos,
  buscarOrcamento,
  atualizarOrcamento,
  enviarOrcamento,
  aprovarOrcamento,
  duplicarOrcamento,
  estaExpirado,
  excluirOrcamento,
} from "@/lib/services/orcamentoService";
import { ForbiddenError } from "@/lib/errors";

async function seedCatalogo() {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento: "ORCAMENTO" },
    update: { prefixo: "ORC", proximoNumero: 1, digitos: 4 },
    create: { tipoDocumento: "ORCAMENTO", prefixo: "ORC", proximoNumero: 1, digitos: 4 },
  });
  await prisma.parametroCalculo.upsert({
    where: { id: 1 },
    update: {
      margemLucroPadrao: 25, custoMaoObraHoraPadrao: 30, percentualCustosIndiretosPadrao: 10,
      impostosPercentualPadrao: 10, comissaoPercentualPadrao: 5, despesasFinanceirasPercentualPadrao: 2,
    },
    create: {
      id: 1, margemLucroPadrao: 25, custoMaoObraHoraPadrao: 30,
      percentualCustosIndiretosPadrao: 10, validadePadraoDias: 15,
      impostosPercentualPadrao: 10, comissaoPercentualPadrao: 5, despesasFinanceirasPercentualPadrao: 2,
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
  const acabamento = await prisma.acabamento.create({
    data: { nome: "Hot stamping", categoria: "HOT_STAMPING", tipoCalculo: "FIXO", valorFixo: 20, percentualPerda: 0 },
  });
  return { cliente, substrato, equipamento, acabamento };
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
          acabamentos: [{ acabamentoId: seed.acabamento.id }],
          tipoMarkup: "MULTIPLICADOR" as const,
          margemLucro: 25,
        },
      ],
    });

    expect(orcamento.numero).toBe("ORC0001");
    expect(orcamento.status).toBe("RASCUNHO");
    expect(orcamento.validadeDias).toBe(15);
    expect(orcamento.itens[0].precoFinal).toBeCloseTo(1251.25, 5);
    expect(orcamento.itens[0].acabamentos).toHaveLength(1);
    expect(orcamento.itens[0].acabamentos[0].custoCalculado).toBe(20);
  });

  it("calculates chapaQuantidade automatically from coresFrente and coresVerso", async () => {
    const chapa = await prisma.substrato.create({
      data: { nome: "Chapa CTP", tipo: "CHAPA_OFFSET", unidadeMedida: "unidade", custoUnitario: 15, atributos: "{}" },
    });

    const orcamento = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{
        descricao: "Folder 4x4", tipo: "OFFSET", substratoId: seed.substrato.id,
        larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id,
        chapaId: chapa.id, coresFrente: 4, coresVerso: 4,
        acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0,
      }],
    });

    expect(orcamento.itens[0].chapaQuantidade).toBe(8);
  });

  it("prices an item with markup DIVISOR using impostos/comissão/despesas financeiras from parâmetros", async () => {
    const orcamento = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{
        descricao: "Item divisor", tipo: "DIGITAL", substratoId: seed.substrato.id,
        larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id,
        acabamentos: [], tipoMarkup: "DIVISOR" as const, margemLucro: 15,
      }],
    });

    expect(orcamento.itens[0].custoCalculado).toBeCloseTo(979, 5);
    expect(orcamento.itens[0].precoFinal).toBeCloseTo(979 / 0.68, 5);
  });

  it("calculates substratoFolhas automatically from the best aproveitamento when not informed", async () => {
    const papelPorFolha = await prisma.substrato.create({
      data: { nome: "Couché 300g folha", tipo: "PAPEL", unidadeMedida: "folha", custoUnitario: 2, atributos: "{}" },
    });

    const orcamento = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{
        descricao: "Cartão de visita", tipo: "DIGITAL", substratoId: papelPorFolha.id,
        larguraCm: 9, alturaCm: 5, tiragem: 1000, equipamentoId: seed.equipamento.id,
        acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0,
      }],
    });

    expect(orcamento.itens[0].substratoFolhas).toBeGreaterThan(0);
  });

  it("lists and searches by cliente nome", async () => {
    await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
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
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id, acabamentos: [{ acabamentoId: seed.acabamento.id }], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 25 }],
    });

    const atualizado = await atualizarOrcamento(criado.id, {
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item editado", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 100, alturaCm: 50, tiragem: 100, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 25 }],
    });

    expect(atualizado.itens[0].descricao).toBe("Item editado");
    expect(atualizado.itens[0].precoFinal).toBeCloseTo(1223.75, 5);
  });

  it("rejects updating an APROVADO orcamento", async () => {
    const itemInput = { descricao: "Item", tipo: "DIGITAL" as const, substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 };
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [itemInput],
    });
    await prisma.orcamento.update({ where: { id: criado.id }, data: { status: "APROVADO" } });

    await expect(
      atualizarOrcamento(criado.id, { clienteId: seed.cliente.id, itens: [itemInput] })
    ).rejects.toThrow(ForbiddenError);
  });

  it("sends an orcamento, moving RASCUNHO to ENVIADO", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    const enviado = await enviarOrcamento(criado.id);
    expect(enviado.status).toBe("ENVIADO");
    expect(enviado.dataEnvio).not.toBeNull();
  });

  it("rejects approving a RASCUNHO orcamento (must be sent first)", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    await expect(aprovarOrcamento(criado.id)).rejects.toThrow(ForbiddenError);
  });

  it("approves a sent orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    const aprovado = await aprovarOrcamento(criado.id);
    expect(aprovado.status).toBe("APROVADO");
    expect(aprovado.dataAprovacao).not.toBeNull();
  });

  it("rejects approving an expired orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    await prisma.orcamento.update({
      where: { id: criado.id },
      data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), validadeDias: 15 },
    });
    await expect(aprovarOrcamento(criado.id)).rejects.toThrow("expirado");
  });

  it("duplicates an orcamento into a fresh RASCUNHO with a new numero", async () => {
    const original = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item original", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    await enviarOrcamento(original.id);

    const copia = await duplicarOrcamento(original.id);
    expect(copia.id).not.toBe(original.id);
    expect(copia.numero).not.toBe(original.numero);
    expect(copia.status).toBe("RASCUNHO");
    expect(copia.dataEnvio).toBeNull();
    expect(copia.itens).toHaveLength(1);
    expect(copia.itens[0].descricao).toBe("Item original");
    expect(copia.itens[0].id).not.toBe(original.itens[0].id);
  });

  it("duplicates an orcamento carrying over catálogo and avulso acabamentos", async () => {
    const original = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{
        descricao: "Item com acabamentos", tipo: "DIGITAL", substratoId: seed.substrato.id,
        larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id,
        acabamentos: [
          { acabamentoId: seed.acabamento.id },
          { descricaoAvulsa: "Corte especial", valorAvulso: 15 },
        ],
        tipoMarkup: "MULTIPLICADOR" as const,
        margemLucro: 0,
      }],
    });

    const copia = await duplicarOrcamento(original.id);
    expect(copia.itens[0].acabamentos).toHaveLength(2);
    const total = copia.itens[0].acabamentos.reduce((soma, a) => soma + a.custoCalculado, 0);
    expect(total).toBe(35);
  });

  it("creates an item with an avulso acabamento", async () => {
    const orcamento = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{
        descricao: "Item avulso", tipo: "DIGITAL", substratoId: seed.substrato.id,
        larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id,
        acabamentos: [{ descricaoAvulsa: "Verniz localizado", valorAvulso: 15 }],
        tipoMarkup: "MULTIPLICADOR" as const,
        margemLucro: 0,
      }],
    });
    expect(orcamento.itens[0].acabamentos[0].descricaoAvulsa).toBe("Verniz localizado");
    expect(orcamento.itens[0].acabamentos[0].custoCalculado).toBe(15);
  });

  it("throws NotFoundError when acabamentoId does not exist", async () => {
    await expect(
      criarOrcamento({
        clienteId: seed.cliente.id,
        itens: [{
          descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id,
          larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id,
          acabamentos: [{ acabamentoId: "id-inexistente" }],
          tipoMarkup: "MULTIPLICADOR" as const,
          margemLucro: 0,
        }],
      })
    ).rejects.toThrow("acabamento");
  });

  it("rejects deleting an APROVADO orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    await aprovarOrcamento(criado.id);

    await expect(excluirOrcamento(criado.id)).rejects.toThrow(ForbiddenError);
    await expect(buscarOrcamento(criado.id)).resolves.toBeTruthy();
  });

  it("deletes a RASCUNHO orcamento", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });

    await excluirOrcamento(criado.id);

    await expect(buscarOrcamento(criado.id)).rejects.toThrow("Não encontrado");
  });

  it("estaExpirado is false for an APROVADO orcamento even past validadeDias", async () => {
    const criado = await criarOrcamento({
      clienteId: seed.cliente.id,
      itens: [{ descricao: "Item", tipo: "DIGITAL", substratoId: seed.substrato.id, larguraCm: 10, alturaCm: 10, tiragem: 1, equipamentoId: seed.equipamento.id, acabamentos: [], tipoMarkup: "MULTIPLICADOR" as const, margemLucro: 0 }],
    });
    await enviarOrcamento(criado.id);
    const aprovado = await aprovarOrcamento(criado.id);
    await prisma.orcamento.update({
      where: { id: criado.id },
      data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const recarregado = await buscarOrcamento(criado.id);
    expect(estaExpirado(recarregado)).toBe(false);
    expect(recarregado.status).toBe("APROVADO");
  });
});
