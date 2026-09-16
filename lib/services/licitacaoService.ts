import { prisma } from "@/lib/prisma";
import { parseNumeroControlePNCP, buscarContratacaoPNCP } from "@/lib/external/pncp";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Licitacao } from "@prisma/client";

export async function cadastrarLicitacao(numeroControlePNCP: string): Promise<Licitacao> {
  const parseado = parseNumeroControlePNCP(numeroControlePNCP);
  if (!parseado) {
    throw new ForbiddenError("Número de Controle PNCP em formato inválido");
  }

  const existente = await prisma.licitacao.findUnique({ where: { numeroControlePNCP } });
  if (existente) {
    throw new ForbiddenError("Esta licitação já está cadastrada");
  }

  const dados = await buscarContratacaoPNCP(parseado.cnpj, parseado.ano, parseado.sequencial);
  if (!dados) {
    throw new NotFoundError("Licitação não encontrada no PNCP");
  }

  return prisma.licitacao.create({
    data: {
      numeroControlePNCP,
      cnpjOrgao: parseado.cnpj,
      anoCompra: parseado.ano,
      sequencialCompra: parseado.sequencial,
      orgaoNome: dados.orgaoNome,
      unidadeNome: dados.unidadeNome,
      numeroCompra: dados.numeroCompra,
      objetoCompra: dados.objetoCompra,
      modalidadeNome: dados.modalidadeNome,
      situacaoCompraNome: dados.situacaoCompraNome,
      valorTotalEstimado: dados.valorTotalEstimado,
      valorTotalHomologado: dados.valorTotalHomologado,
      dataAberturaProposta: dados.dataAberturaProposta ? new Date(dados.dataAberturaProposta) : null,
      dataEncerramentoProposta: dados.dataEncerramentoProposta
        ? new Date(dados.dataEncerramentoProposta)
        : null,
      dataAtualizacaoPNCP: new Date(),
      statusInterno: "ANALISANDO",
    },
  });
}

export async function listarLicitacoes(search?: string): Promise<Licitacao[]> {
  const todas = await prisma.licitacao.findMany({ orderBy: { createdAt: "desc" } });
  if (!search) return todas;
  const termo = search.toLowerCase();
  return todas.filter(
    (l) =>
      l.objetoCompra.toLowerCase().includes(termo) ||
      l.orgaoNome.toLowerCase().includes(termo) ||
      l.numeroCompra.toLowerCase().includes(termo)
  );
}

export async function buscarLicitacao(id: string): Promise<Licitacao> {
  const licitacao = await prisma.licitacao.findUnique({ where: { id } });
  if (!licitacao) throw new NotFoundError();
  return licitacao;
}
