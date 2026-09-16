"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fornecedor {
  id: string;
  razaoSocial: string;
  cnpj: string;
  categoria: string | null;
  contato: string | null;
  telefone: string | null;
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/fornecedores?search=${encodeURIComponent(search)}`).then((r) => r.json()).then(setFornecedores);
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Fornecedores</h1>
        <Link href="/fornecedores/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo fornecedor</Link>
      </div>
      <input placeholder="Buscar por razão social ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full max-w-md rounded border px-3 py-2" />
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2">Razão social</th>
            <th className="py-2">CNPJ</th>
            <th className="py-2">Categoria</th>
            <th className="py-2">Contato</th>
            <th className="py-2">Telefone</th>
          </tr>
        </thead>
        <tbody>
          {fornecedores.map((f) => (
            <tr key={f.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/fornecedores/${f.id}`}>{f.razaoSocial}</Link></td>
              <td className="py-2">{f.cnpj}</td>
              <td className="py-2">{f.categoria}</td>
              <td className="py-2">{f.contato}</td>
              <td className="py-2">{f.telefone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
