// app/(dashboard)/licitacoes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LicitacaoStatusBadge from "@/components/LicitacaoStatusBadge";

interface LicitacaoListada {
  id: string;
  numeroCompra: string;
  orgaoNome: string;
  objetoCompra: string;
  statusInterno: string;
  valorTotalEstimado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
}

export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoListada[]>([]);
  const [search, setSearch] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/licitacoes?search=${encodeURIComponent(search)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setLicitacoes(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar licitações");
      })
      .catch(() => setErro("Erro ao carregar licitações"));
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Licitações</h1>
        <Link href="/licitacoes/nova" className="rounded bg-ciano px-4 py-2 text-sm text-white">
          Nova Licitação
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por objeto, órgão ou número..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border px-3 py-2"
      />

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Número</th>
            <th>Órgão</th>
            <th>Objeto</th>
            <th>Valor estimado</th>
            <th>Abertura da proposta</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {licitacoes.map((l) => (
            <tr key={l.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/licitacoes/${l.id}`} className="text-ciano">
                  {l.numeroCompra}
                </Link>
              </td>
              <td>{l.orgaoNome}</td>
              <td className="max-w-xs truncate">{l.objetoCompra}</td>
              <td>{l.valorTotalEstimado != null ? `R$ ${l.valorTotalEstimado.toFixed(2)}` : "—"}</td>
              <td>
                {l.dataAberturaProposta ? new Date(l.dataAberturaProposta).toLocaleString("pt-BR") : "—"}
              </td>
              <td>
                <LicitacaoStatusBadge
                  statusInterno={l.statusInterno}
                  dataEncerramentoProposta={l.dataEncerramentoProposta}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
