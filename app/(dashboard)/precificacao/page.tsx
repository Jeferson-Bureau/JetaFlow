"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Substrato { id: string; nome: string; tipo: string; unidadeMedida: string; ativo: boolean; }

export default function PrecificacaoPage() {
  const [substratos, setSubstratos] = useState<Substrato[]>([]);

  useEffect(() => {
    fetch("/api/substratos").then((r) => r.json()).then(setSubstratos);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Precificação e Substratos</h1>
        <Link href="/precificacao/substratos/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo substrato</Link>
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">Tipo</th><th className="py-2">Unidade</th><th className="py-2">Status</th></tr></thead>
        <tbody>
          {substratos.map((s) => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/precificacao/substratos/${s.id}`}>{s.nome}</Link></td>
              <td className="py-2">{s.tipo}</td>
              <td className="py-2">{s.unidadeMedida}</td>
              <td className="py-2">{s.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
