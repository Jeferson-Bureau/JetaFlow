import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";
import { calcularItem, type ItemCalculoInput } from "@/lib/services/orcamentoCalculo";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

const INCLUDE_ITENS_E_CLIENTE = {
  itens: true,
  cliente: true,
} satisfies Prisma.OrcamentoInclude;

export type OrcamentoComItens = Prisma.OrcamentoGetPayload<{
  include: typeof INCLUDE_ITENS_E_CLIENTE;
}>;

async function carregarParametros() {
  return prisma.parametroCalculo.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

async function calcularItens(itens: OrcamentoInput["itens"]) {
  const parametros = await carregarParametros();

  return Promise.all(
    itens.map(async (item, ordem) => {
      const substrato = await prisma.substrato.findUniqueOrThrow({ where: { id: item.substratoId } });
      const equipamento = await prisma.equipamento.findUniqueOrThrow({ where: { id: item.equipamentoId } });
      const chapa = item.chapaId
        ? await prisma.substrato.findUniqueOrThrow({ where: { id: item.chapaId } })
        : null;
      const tinta = item.tintaId
        ? await prisma.substrato.findUniqueOrThrow({ where: { id: item.tintaId } })
        : null;

      const calculoInput: ItemCalculoInput = {
        tipo: item.tipo,
        substrato,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        tiragem: item.tiragem,
        equipamento,
        chapa,
        chapaQuantidade: item.chapaQuantidade ?? null,
        tinta,
        tintaQuantidade: item.tintaQuantidade ?? null,
        acabamentoCusto: item.acabamentoCusto,
        margemLucro: item.margemLucro,
        parametros,
      };
      const { custoCalculado, precoFinal } = calcularItem(calculoInput);

      return {
        descricao: item.descricao,
        tipo: item.tipo,
        substratoId: item.substratoId,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        tiragem: item.tiragem,
        equipamentoId: item.equipamentoId,
        chapaId: item.chapaId ?? null,
        chapaQuantidade: item.chapaQuantidade ?? null,
        tintaId: item.tintaId ?? null,
        tintaQuantidade: item.tintaQuantidade ?? null,
        acabamentoDescricao: item.acabamentoDescricao ?? null,
        acabamentoCusto: item.acabamentoCusto,
        margemLucro: item.margemLucro,
        custoCalculado,
        precoFinal,
        ordem,
      };
    })
  );
}

export async function criarOrcamento(input: OrcamentoInput): Promise<OrcamentoComItens> {
  const [numero, itensCalculados, parametros] = await Promise.all([
    alocarProximoNumero("ORCAMENTO"),
    calcularItens(input.itens),
    carregarParametros(),
  ]);

  return prisma.orcamento.create({
    data: {
      numero,
      clienteId: input.clienteId,
      observacoes: input.observacoes ?? null,
      validadeDias: parametros.validadePadraoDias,
      itens: { create: itensCalculados },
    },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function listarOrcamentos(search?: string): Promise<OrcamentoComItens[]> {
  const todos = await prisma.orcamento.findMany({
    include: INCLUDE_ITENS_E_CLIENTE,
    orderBy: { createdAt: "desc" },
  });
  if (!search) return todos;
  const termo = search.toLowerCase();
  return todos.filter(
    (o) => o.numero.toLowerCase().includes(termo) || o.cliente.nome.toLowerCase().includes(termo)
  );
}

export async function buscarOrcamento(id: string): Promise<OrcamentoComItens> {
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
  if (!orcamento) throw new NotFoundError();
  return orcamento;
}

export async function atualizarOrcamento(id: string, input: OrcamentoInput): Promise<OrcamentoComItens> {
  const existente = await buscarOrcamento(id);
  if (existente.status === "APROVADO") {
    throw new ForbiddenError("Orçamento aprovado não pode ser editado");
  }

  const itensCalculados = await calcularItens(input.itens);

  return prisma.$transaction(async (tx) => {
    await tx.orcamentoItem.deleteMany({ where: { orcamentoId: id } });
    return tx.orcamento.update({
      where: { id },
      data: {
        clienteId: input.clienteId,
        observacoes: input.observacoes ?? null,
        itens: { create: itensCalculados },
      },
      include: INCLUDE_ITENS_E_CLIENTE,
    });
  });
}
