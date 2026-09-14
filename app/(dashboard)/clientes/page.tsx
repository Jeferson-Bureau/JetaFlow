"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Cliente { id: string; nome: string; documento: string; telefone: string | null; }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/clientes?search=${encodeURIComponent(search)}`).then((r) => r.json()).then(setClientes);
  }, [search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Clientes</h1>
        <Link href="/clientes/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo cliente</Link>
      </div>
      <input placeholder="Buscar por nome ou documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 w-full max-w-md rounded border px-3 py-2" />
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">Documento</th><th className="py-2">Telefone</th></tr></thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/clientes/${c.id}`}>{c.nome}</Link></td>
              <td className="py-2">{c.documento}</td>
              <td className="py-2">{c.telefone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
