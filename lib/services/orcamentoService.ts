import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";
import { obterParametrosCalculo } from "@/lib/services/parametroCalculoService";
import {
  calcularItem,
  calcularEstaExpirado,
  calcularCustoAcabamento,
  type ItemCalculoInput,
} from "@/lib/services/orcamentoCalculo";
import type { OrcamentoInput } from "@/lib/validators/orcamento";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

const INCLUDE_ITENS_E_CLIENTE = {
  itens: { include: { acabamentos: true } },
  cliente: true,
  ordemServico: true,
} satisfies Prisma.OrcamentoInclude;

export type OrcamentoComItens = Prisma.OrcamentoGetPayload<{
  include: typeof INCLUDE_ITENS_E_CLIENTE;
}>;

async function carregarParametros() {
  return obterParametrosCalculo();
}

async function calcularItens(itens: OrcamentoInput["itens"]) {
  const parametros = await carregarParametros();

  try {
    return await Promise.all(
      itens.map(async (item, ordem) => {
        const substrato = await prisma.substrato.findUniqueOrThrow({ where: { id: item.substratoId } });
        const equipamento = await prisma.equipamento.findUniqueOrThrow({ where: { id: item.equipamentoId } });
        const chapa = item.chapaId
          ? await prisma.substrato.findUniqueOrThrow({ where: { id: item.chapaId } })
          : null;
        const tinta = item.tintaId
          ? await prisma.substrato.findUniqueOrThrow({ where: { id: item.tintaId } })
          : null;

        const acabamentosResolvidos = await Promise.all(
          item.acabamentos.map(async (acabamentoItem, ordemAcabamento) => {
            const acabamento = acabamentoItem.acabamentoId
              ? await prisma.acabamento.findUniqueOrThrow({ where: { id: acabamentoItem.acabamentoId } })
              : null;
            const custoCalculado = calcularCustoAcabamento(
              { acabamento, quantidade: acabamentoItem.quantidade, valorAvulso: acabamentoItem.valorAvulso },
              item.tiragem
            );
            return {
              acabamentoId: acabamentoItem.acabamentoId ?? null,
              descricaoAvulsa: acabamentoItem.descricaoAvulsa ?? null,
              quantidade: acabamentoItem.quantidade ?? null,
              custoCalculado,
              ordem: ordemAcabamento,
            };
          })
        );
        const acabamentoCustoTotal = acabamentosResolvidos.reduce((soma, a) => soma + a.custoCalculado, 0);

        const calculoInput: ItemCalculoInput = {
          tipo: item.tipo,
          substrato,
          larguraCm: item.larguraCm,
          alturaCm: item.alturaCm,
          tiragem: item.tiragem,
          equipamento,
          chapa,
          coresFrente: item.coresFrente ?? null,
          coresVerso: item.coresVerso ?? null,
          tinta,
          tintaQuantidade: item.tintaQuantidade ?? null,
          substratoFolhas: item.substratoFolhas ?? null,
          acabamentoCustoTotal,
          tipoMarkup: item.tipoMarkup,
          margemLucro: item.margemLucro,
          parametros,
        };
        const { custoCalculado, precoFinal, chapaQuantidade, substratoFolhas } = calcularItem(calculoInput);

        return {
          descricao: item.descricao,
          tipo: item.tipo,
          substratoId: item.substratoId,
          larguraCm: item.larguraCm,
          alturaCm: item.alturaCm,
          tiragem: item.tiragem,
          equipamentoId: item.equipamentoId,
          chapaId: item.chapaId ?? null,
          coresFrente: item.coresFrente ?? null,
          coresVerso: item.coresVerso ?? null,
          chapaQuantidade,
          tintaId: item.tintaId ?? null,
          tintaQuantidade: item.tintaQuantidade ?? null,
          substratoFolhas,
          acabamentos: { create: acabamentosResolvidos },
          tipoMarkup: item.tipoMarkup,
          margemLucro: item.margemLucro,
          custoCalculado,
          precoFinal,
          ordem,
        };
      })
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new NotFoundError("Substrato, equipamento, chapa, tinta ou acabamento informado não foi encontrado");
    }
    throw error;
  }
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

export function estaExpirado(orcamento: OrcamentoComItens): boolean {
  return calcularEstaExpirado(orcamento.status, orcamento.createdAt, orcamento.validadeDias);
}

export async function enviarOrcamento(id: string): Promise<OrcamentoComItens> {
  const existente = await buscarOrcamento(id);
  if (existente.status !== "RASCUNHO") {
    throw new ForbiddenError("Só é possível enviar um orçamento em rascunho");
  }
  return prisma.orcamento.update({
    where: { id },
    data: { status: "ENVIADO", dataEnvio: new Date() },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function aprovarOrcamento(id: string): Promise<OrcamentoComItens> {
  const existente = await buscarOrcamento(id);
  if (existente.status !== "ENVIADO") {
    throw new ForbiddenError("Só é possível aprovar um orçamento enviado");
  }
  if (estaExpirado(existente)) {
    throw new ForbiddenError("Orçamento expirado não pode ser aprovado");
  }
  return prisma.orcamento.update({
    where: { id },
    data: { status: "APROVADO", dataAprovacao: new Date() },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function duplicarOrcamento(id: string): Promise<OrcamentoComItens> {
  const original = await buscarOrcamento(id);
  const numero = await alocarProximoNumero("ORCAMENTO");

  const itensParaRecalcular: OrcamentoInput["itens"] = original.itens
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => ({
      descricao: item.descricao,
      tipo: item.tipo as "DIGITAL" | "OFFSET",
      substratoId: item.substratoId,
      larguraCm: item.larguraCm,
      alturaCm: item.alturaCm,
      tiragem: item.tiragem,
      equipamentoId: item.equipamentoId,
      chapaId: item.chapaId,
      coresFrente: item.coresFrente,
      coresVerso: item.coresVerso,
      tintaId: item.tintaId,
      tintaQuantidade: item.tintaQuantidade,
      substratoFolhas: item.substratoFolhas,
      acabamentos: item.acabamentos
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((a) => ({
          acabamentoId: a.acabamentoId,
          descricaoAvulsa: a.descricaoAvulsa,
          quantidade: a.quantidade,
          valorAvulso: a.acabamentoId ? null : a.custoCalculado,
        })),
      tipoMarkup: item.tipoMarkup as "MULTIPLICADOR" | "DIVISOR",
      margemLucro: item.margemLucro,
    }));

  const itensCalculados = await calcularItens(itensParaRecalcular);

  return prisma.orcamento.create({
    data: {
      numero,
      clienteId: original.clienteId,
      observacoes: original.observacoes,
      validadeDias: original.validadeDias,
      itens: { create: itensCalculados },
    },
    include: INCLUDE_ITENS_E_CLIENTE,
  });
}

export async function excluirOrcamento(id: string): Promise<void> {
  const existente = await buscarOrcamento(id);
  if (existente.status === "APROVADO") {
    throw new ForbiddenError("Orçamento aprovado não pode ser excluído");
  }
  await prisma.orcamento.delete({ where: { id } });
}
