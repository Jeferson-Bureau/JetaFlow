// app/(dashboard)/licitacoes/[id]/LicitacaoDetalheClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LicitacaoStatusBadge from "@/components/LicitacaoStatusBadge";
import { STATUS_INTERNO_LICITACAO } from "@/lib/services/licitacaoCalculo";

interface LicitacaoDetalheClientProps {
  id: string;
  numeroControlePNCP: string;
  numeroCompra: string;
  orgaoNome: string;
  unidadeNome: string;
  objetoCompra: string;
  modalidadeNome: string;
  situacaoCompraNome: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  dataAtualizacaoPNCP: string;
  statusInterno: string;
  valorProposta: number | null;
  responsavel: string;
  observacoes: string;
}

const LABELS_STATUS: Record<string, string> = {
  ANALISANDO: "Analisando",
  VAMOS_PARTICIPAR: "Vamos participar",
  PROPOSTA_ENVIADA: "Proposta enviada",
  GANHAMOS: "Ganhamos",
  PERDEMOS: "Perdemos",
  DESISTIMOS: "Desistimos",
};

export default function LicitacaoDetalheClient({
  id,
  numeroControlePNCP,
  numeroCompra,
  orgaoNome,
  unidadeNome,
  objetoCompra,
  modalidadeNome,
  situacaoCompraNome,
  valorTotalEstimado,
  valorTotalHomologado,
  dataAberturaProposta,
  dataEncerramentoProposta,
  dataAtualizacaoPNCP: dataAtualizacaoPNCPInicial,
  statusInterno: statusInternoInicial,
  valorProposta: valorPropostaInicial,
  responsavel: responsavelInicial,
  observacoes: observacoesInicial,
}: LicitacaoDetalheClientProps) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dataAtualizacaoPNCP, setDataAtualizacaoPNCP] = useState(dataAtualizacaoPNCPInicial);
  const [statusInterno, setStatusInterno] = useState(statusInternoInicial);
  const [valorProposta, setValorProposta] = useState(valorPropostaInicial?.toString() ?? "");
  const [responsavel, setResponsavel] = useState(responsavelInicial);
  const [observacoes, setObservacoes] = useState(observacoesInicial);

  async function atualizarDoPNCP() {
    setErro("");
    setCarregando(true);
    try {
      const response = await fetch(`/api/licitacoes/${id}/atualizar`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao atualizar dados do PNCP");
        return;
      }
      router.refresh();
      const data = await response.json();
      setDataAtualizacaoPNCP(data.dataAtualizacaoPNCP);
    } catch {
      setErro("Erro ao atualizar dados do PNCP — verifique sua conexão");
    } finally {
      setCarregando(false);
    }
  }

  async function salvarDadosInternos(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const response = await fetch(`/api/licitacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusInterno,
          valorProposta: valorProposta === "" ? null : Number(valorProposta),
          responsavel: responsavel || null,
          observacoes: observacoes || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao salvar");
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro ao salvar — verifique sua conexão");
    }
  }

  async function excluir() {
    setErro("");
    try {
      const response = await fetch(`/api/licitacoes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao excluir");
        return;
      }
      router.push("/licitacoes");
    } catch {
      setErro("Erro ao excluir — verifique sua conexão");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Licitação {numeroCompra}</h1>
        <LicitacaoStatusBadge statusInterno={statusInterno} dataEncerramentoProposta={dataEncerramentoProposta} />
      </div>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <div className="mb-6 rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-marinho">Dados do PNCP</h2>
          <button
            type="button"
            disabled={carregando}
            onClick={atualizarDoPNCP}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Atualizar
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Número de Controle PNCP</dt>
            <dd>{numeroControlePNCP}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Órgão</dt>
            <dd>{orgaoNome}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unidade</dt>
            <dd>{unidadeNome}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Modalidade</dt>
            <dd>{modalidadeNome}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Objeto</dt>
            <dd>{objetoCompra}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Situação no PNCP</dt>
            <dd>{situacaoCompraNome}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Valor estimado</dt>
            <dd>{valorTotalEstimado != null ? `R$ ${valorTotalEstimado.toFixed(2)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Valor homologado</dt>
            <dd>{valorTotalHomologado != null ? `R$ ${valorTotalHomologado.toFixed(2)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Abertura da proposta</dt>
            <dd>{dataAberturaProposta ? new Date(dataAberturaProposta).toLocaleString("pt-BR") : "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Encerramento da proposta</dt>
            <dd>
              {dataEncerramentoProposta ? new Date(dataEncerramentoProposta).toLocaleString("pt-BR") : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-400">
          Atualizado em {new Date(dataAtualizacaoPNCP).toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-semibold text-marinho">Controle interno</h2>
        <form onSubmit={salvarDadosInternos} className="max-w-sm space-y-3">
          <label className="block text-sm">
            Status
            <select
              value={statusInterno}
              onChange={(e) => setStatusInterno(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {STATUS_INTERNO_LICITACAO.map((status) => (
                <option key={status} value={status}>
                  {LABELS_STATUS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Valor da proposta
            <input
              type="number"
              value={valorProposta}
              onChange={(e) => setValorProposta(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Responsável
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Observações
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded bg-ciano px-4 py-2 text-sm text-white">
            Salvar
          </button>
        </form>
      </div>

      <button type="button" onClick={excluir} className="text-sm text-rosa underline">
        Excluir licitação
      </button>
    </div>
  );
}
