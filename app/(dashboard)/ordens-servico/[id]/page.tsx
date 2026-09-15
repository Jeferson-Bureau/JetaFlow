import { notFound } from "next/navigation";
import { buscarOrdemServico } from "@/lib/services/ordemServicoService";
import { NotFoundError } from "@/lib/errors";
import OrdemServicoDetalheClient from "./OrdemServicoDetalheClient";

export default async function OrdemServicoDetalhePage({ params }: { params: { id: string } }) {
  let ordem;
  try {
    ordem = await buscarOrdemServico(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const total = ordem.orcamento.itens.reduce((soma, item) => soma + item.precoFinal, 0);

  return (
    <OrdemServicoDetalheClient
      id={ordem.id}
      numero={ordem.numero}
      estagio={ordem.estagio}
      estagioDesde={ordem.estagioDesde.toISOString()}
      prazoEntrega={ordem.prazoEntrega ? ordem.prazoEntrega.toISOString().slice(0, 10) : ""}
      observacoes={ordem.observacoes ?? ""}
      clienteNome={ordem.orcamento.cliente.nome}
      itens={ordem.orcamento.itens
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => ({
          id: item.id,
          descricao: item.descricao,
          tiragem: item.tiragem,
          precoFinal: item.precoFinal,
        }))}
      total={total}
    />
  );
}
