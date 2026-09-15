"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calcularEstaExpirado } from "@/lib/services/orcamentoCalculo";

interface OrcamentoListado {
  id: string;
  numero: string;
  status: string;
  createdAt: string;
  validadeDias: number;
  cliente: { nome: string };
  itens: { precoFinal: number }[];
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoListado[]>([]);
  const [search, setSearch] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/orcamentos?search=${encodeURIComponent(search)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setOrcamentos(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar orçamentos");
      })
      .catch(() => setErro("Erro ao carregar orçamentos"));
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Orçamentos</h1>
        <Link href="/orcamentos/novo" className="rounded bg-ciano px-4 py-2 text-white">
          Novo orçamento
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por número ou cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded border px-3 py-2"
      />

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Número</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.map((o) => (
            <tr key={o.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <a href={`/orcamentos/${o.id}`} className="text-ciano">
                  {o.numero}
                </a>
              </td>
              <td>{o.cliente.nome}</td>
              <td>{calcularEstaExpirado(o.status, o.createdAt, o.validadeDias) ? "Expirado" : o.status}</td>
              <td>R$ {o.itens.reduce((soma, item) => soma + item.precoFinal, 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
