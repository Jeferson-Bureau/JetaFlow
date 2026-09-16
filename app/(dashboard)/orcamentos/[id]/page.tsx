import { notFound } from "next/navigation";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { NotFoundError } from "@/lib/errors";
import OrcamentoDetalheClient from "./OrcamentoDetalheClient";

export default async function OrcamentoDetalhePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let orcamento;
  try {
    orcamento = await buscarOrcamento(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const total = orcamento.itens.reduce((soma, item) => soma + item.precoFinal, 0);

  return (
    <OrcamentoDetalheClient
      id={orcamento.id}
      numero={orcamento.numero}
      status={orcamento.status}
      createdAt={orcamento.createdAt.toISOString()}
      validadeDias={orcamento.validadeDias}
      total={total}
      ordemServicoId={orcamento.ordemServico?.id ?? null}
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
                descricaoAvulsa: a.descricaoAvulsa ?? "",
                quantidade: a.quantidade,
                valorAvulso: a.acabamentoId ? 0 : a.custoCalculado,
              })),
            tipoMarkup: item.tipoMarkup as "MULTIPLICADOR" | "DIVISOR",
            margemLucro: item.margemLucro,
          })),
      }}
    />
  );
}
