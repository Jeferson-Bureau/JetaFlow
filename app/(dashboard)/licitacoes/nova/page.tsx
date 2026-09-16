// app/(dashboard)/licitacoes/nova/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NovaLicitacaoPage() {
  const router = useRouter();
  const [numeroControlePNCP, setNumeroControlePNCP] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const response = await fetch("/api/licitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroControlePNCP }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao cadastrar licitação");
        return;
      }
      const licitacao = await response.json();
      router.push(`/licitacoes/${licitacao.id}`);
    } catch {
      setErro("Erro ao cadastrar licitação — verifique sua conexão");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Nova Licitação</h1>

      <form onSubmit={cadastrar} className="space-y-3">
        <label className="block text-sm">
          Número de Controle PNCP
          <input
            type="text"
            placeholder="Ex: 01612441000107-1-000131/2026"
            value={numeroControlePNCP}
            onChange={(e) => setNumeroControlePNCP(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Copie esse código da página da licitação no portal do PNCP (pncp.gov.br)
          </span>
        </label>

        {erro && <p className="text-sm text-rosa">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="rounded bg-ciano px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Cadastrar
        </button>
      </form>
    </div>
  );
}
