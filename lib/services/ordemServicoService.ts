import { prisma } from "@/lib/prisma";
import { alocarProximoNumero } from "@/lib/services/numeracaoService";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

const INCLUDE_ORCAMENTO_COMPLETO = {
  orcamento: {
    include: { cliente: true, itens: true },
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

  return prisma.ordemServico.create({
    data: { numero, orcamentoId },
    include: INCLUDE_ORCAMENTO_COMPLETO,
  });
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
