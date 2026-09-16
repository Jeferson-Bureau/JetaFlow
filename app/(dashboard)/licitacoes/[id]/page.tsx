// app/(dashboard)/licitacoes/[id]/page.tsx
import { notFound } from "next/navigation";
import { buscarLicitacao } from "@/lib/services/licitacaoService";
import { NotFoundError } from "@/lib/errors";
import LicitacaoDetalheClient from "./LicitacaoDetalheClient";

export default async function LicitacaoDetalhePage({ params }: { params: { id: string } }) {
  let licitacao;
  try {
    licitacao = await buscarLicitacao(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <LicitacaoDetalheClient
      id={licitacao.id}
      numeroControlePNCP={licitacao.numeroControlePNCP}
      numeroCompra={licitacao.numeroCompra}
      orgaoNome={licitacao.orgaoNome}
      unidadeNome={licitacao.unidadeNome}
      objetoCompra={licitacao.objetoCompra}
      modalidadeNome={licitacao.modalidadeNome}
      situacaoCompraNome={licitacao.situacaoCompraNome}
      valorTotalEstimado={licitacao.valorTotalEstimado}
      valorTotalHomologado={licitacao.valorTotalHomologado}
      dataAberturaProposta={licitacao.dataAberturaProposta ? licitacao.dataAberturaProposta.toISOString() : null}
      dataEncerramentoProposta={
        licitacao.dataEncerramentoProposta ? licitacao.dataEncerramentoProposta.toISOString() : null
      }
      dataAtualizacaoPNCP={licitacao.dataAtualizacaoPNCP.toISOString()}
      statusInterno={licitacao.statusInterno}
      valorProposta={licitacao.valorProposta}
      responsavel={licitacao.responsavel ?? ""}
      observacoes={licitacao.observacoes ?? ""}
    />
  );
}
