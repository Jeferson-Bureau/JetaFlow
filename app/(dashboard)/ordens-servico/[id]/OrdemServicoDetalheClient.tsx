"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrdemServicoEstagioBadge from "@/components/OrdemServicoEstagioBadge";

interface ItemResumo {
  id: string;
  descricao: string;
  tiragem: number;
  precoFinal: number;
}

interface OrdemServicoDetalheClientProps {
  id: string;
  numero: string;
  estagio: string;
  estagioDesde: string;
  prazoEntrega: string;
  observacoes: string;
  clienteNome: string;
  itens: ItemResumo[];
  total: number;
}

export default function OrdemServicoDetalheClient({
  id,
  numero,
  estagio,
  estagioDesde,
  prazoEntrega: prazoEntregaInicial,
  observacoes: observacoesInicial,
  clienteNome,
  itens,
  total,
}: OrdemServicoDetalheClientProps) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [prazoEntrega, setPrazoEntrega] = useState(prazoEntregaInicial);
  const [observacoes, setObservacoes] = useState(observacoesInicial);

  async function avancarOuVoltar(acao: "avancar" | "voltar") {
    setErro("");
    setCarregando(true);
    const response = await fetch(`/api/ordens-servico/${id}/${acao}`, { method: "POST" });
    setCarregando(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao mudar estágio");
      return;
    }
    router.refresh();
  }

  async function salvarDetalhes(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const response = await fetch(`/api/ordens-servico/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prazoEntrega: prazoEntrega || null,
        observacoes: observacoes || null,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao salvar");
      return;
    }
    router.refresh();
  }

  const desde = new Date(estagioDesde);
  const horasNoEstagio = Math.max(0, Math.round((Date.now() - desde.getTime()) / (1000 * 60 * 60)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">
          OS {numero} — {clienteNome}
        </h1>
        <OrdemServicoEstagioBadge estagio={estagio} prazoEntrega={prazoEntrega || null} />
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Neste estágio há {horasNoEstagio}h — Total:{" "}
        <span className="font-semibold text-marinho">R$ {total.toFixed(2)}</span>
      </p>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          disabled={carregando || estagio === "ARQUIVO_RECEBIDO"}
          onClick={() => avancarOuVoltar("voltar")}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          Voltar estágio
        </button>
        <button
          type="button"
          disabled={carregando || estagio === "CONCLUIDO"}
          onClick={() => avancarOuVoltar("avancar")}
          className="rounded bg-ciano px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Avançar estágio
        </button>
      </div>

      <table className="mb-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Item</th>
            <th>Tiragem</th>
            <th>Preço</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.descricao}</td>
              <td>{item.tiragem}</td>
              <td>R$ {item.precoFinal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvarDetalhes} className="max-w-sm space-y-3">
        <label className="block text-sm">
          Prazo de entrega
          <input
            type="date"
            value={prazoEntrega}
            onChange={(e) => setPrazoEntrega(e.target.value)}
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
  );
}
