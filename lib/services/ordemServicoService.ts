import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { ESTAGIOS_OS } from "@/lib/services/ordemServicoCalculo";
import type { OrdemServicoInput } from "@/lib/validators/ordemServico";
import { Prisma } from "@prisma/client";

const INCLUDE_ORCAMENTO_COMPLETO = {
  orcamento: {
    include: {
      cliente: true,
      itens: {
        select: { id: true, descricao: true, tiragem: true, precoFinal: true, ordem: true },
      },
    },
  },
} satisfies Prisma.OrdemServicoInclude;

export type OrdemServicoComOrcamento = Prisma.OrdemServicoGetPayload<{
  include: typeof INCLUDE_ORCAMENTO_COMPLETO;
}>;

export async function converterEmOS(orcamentoId: string): Promise<OrdemServicoComOrcamento> {
  const orcamento = await buscarOrcamento(orcamentoId);
  if (orcamento.status !== "APROVADO") {
    throw new ForbiddenError("Só é possível converter um orçamento aprovado em OS");
  }

  const existente = await prisma.ordemServico.findUnique({ where: { orcamentoId } });
  if (existente) {
    throw new ForbiddenError("Este orçamento já foi convertido em OS");
  }

  const numero = await alocarProximoNumero("OS");

  // A losing concurrent call may still burn a number here (see alocarProximoNumero) —
  // accepted: SQLite single-writer makes the race window negligible, and this catch
  // at least turns it into the correct user-facing error instead of a raw 409.
  try {
    return await prisma.ordemServico.create({
      data: { numero, orcamentoId },
      include: INCLUDE_ORCAMENTO_COMPLETO,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ForbiddenError("Este orçamento já foi convertido em OS");
    }
    throw error;
  }
}

export async function listarOrdensServico(search?: string): Promise<OrdemServicoComOrcamento[]> {
  const todas = await prisma.ordemServico.findMany({
    include: INCLUDE_ORCAMENTO_COMPLETO,
    orderBy: { createdAt: "desc" },
  });
  if (!search) return todas;
  const termo = search.toLowerCase();
  return todas.filter(
    (os) =>
      os.numero.toLowerCase().includes(termo) ||
      os.orcamento.cliente.nome.toLowerCase().includes(termo)
  );
}

export async function buscarOrdemServico(id: string): Promise<OrdemServicoComOrcamento> {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
  if (!ordem) throw new NotFoundError();
  return ordem;
}

export async function atualizarOrdemServico(
  id: string,
  input: OrdemServicoInput
): Promise<OrdemServicoComOrcamento> {
  await buscarOrdemServico(id);
  const data: Prisma.OrdemServicoUpdateInput = {};
  if (input.prazoEntrega !== undefined) {
    data.prazoEntrega = input.prazoEntrega ? new Date(input.prazoEntrega) : null;
  }
  if (input.observacoes !== undefined) {
    data.observacoes = input.observacoes;
  }
  return prisma.ordemServico.update({
    where: { id },
    data,
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}

export async function avancarEstagio(id: string): Promise<OrdemServicoComOrcamento> {
  const existente = await buscarOrdemServico(id);
  const indiceAtual = ESTAGIOS_OS.indexOf(existente.estagio as (typeof ESTAGIOS_OS)[number]);
  if (indiceAtual === ESTAGIOS_OS.length - 1) {
    throw new ForbiddenError("Ordem de serviço já está no último estágio");
  }
  const proximoEstagio = ESTAGIOS_OS[indiceAtual + 1];
  return prisma.ordemServico.update({
    where: { id },
    data: { estagio: proximoEstagio, estagioDesde: new Date() },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}

export async function voltarEstagio(id: string): Promise<OrdemServicoComOrcamento> {
  const existente = await buscarOrdemServico(id);
  const indiceAtual = ESTAGIOS_OS.indexOf(existente.estagio as (typeof ESTAGIOS_OS)[number]);
  if (indiceAtual === 0) {
    throw new ForbiddenError("Ordem de serviço já está no primeiro estágio");
  }
  const estagioAnterior = ESTAGIOS_OS[indiceAtual - 1];
  return prisma.ordemServico.update({
    where: { id },
    data: { estagio: estagioAnterior, estagioDesde: new Date() },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
}
