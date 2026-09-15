"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OrdemServicoEstagioBadge from "@/components/OrdemServicoEstagioBadge";

interface OrdemServicoListada {
  id: string;
  numero: string;
  estagio: string;
  prazoEntrega: string | null;
  orcamento: {
    cliente: { nome: string };
    itens: { precoFinal: number }[];
  };
}

export default function OrdensServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServicoListada[]>([]);
  const [search, setSearch] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/ordens-servico?search=${encodeURIComponent(search)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setOrdens(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar ordens de serviço");
      })
      .catch(() => setErro("Erro ao carregar ordens de serviço"));
  }, [search]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Ordens de Serviço</h1>

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
            <th>Estágio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ordens.map((os) => (
            <tr key={os.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/ordens-servico/${os.id}`} className="text-ciano">
                  {os.numero}
                </Link>
              </td>
              <td>{os.orcamento.cliente.nome}</td>
              <td>
                <OrdemServicoEstagioBadge estagio={os.estagio} prazoEntrega={os.prazoEntrega} />
              </td>
              <td>
                R${" "}
                {os.orcamento.itens
                  .reduce((soma, item) => soma + item.precoFinal, 0)
                  .toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
