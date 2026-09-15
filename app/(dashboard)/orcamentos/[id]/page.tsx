import { notFound } from "next/navigation";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { NotFoundError } from "@/lib/errors";
import OrcamentoDetalheClient from "./OrcamentoDetalheClient";

export default async function OrcamentoDetalhePage({ params }: { params: { id: string } }) {
  let orcamento;
  try {
    orcamento = await buscarOrcamento(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <OrcamentoDetalheClient
      id={orcamento.id}
      numero={orcamento.numero}
      status={orcamento.status}
      clienteTelefone={orcamento.cliente.telefone}
      clienteNome={orcamento.cliente.nome}
      initial={{
        id: orcamento.id,
        clienteId: orcamento.clienteId,
        observacoes: orcamento.observacoes ?? "",
        itens: orcamento.itens
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
            chapaQuantidade: item.chapaQuantidade,
            tintaId: item.tintaId,
            tintaQuantidade: item.tintaQuantidade,
            acabamentoDescricao: item.acabamentoDescricao ?? "",
            acabamentoCusto: item.acabamentoCusto,
            margemLucro: item.margemLucro,
          })),
      }}
    />
  );
}
