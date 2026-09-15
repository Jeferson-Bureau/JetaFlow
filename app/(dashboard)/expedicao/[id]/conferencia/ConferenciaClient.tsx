"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calcularProgressoConferencia } from "@/lib/services/expedicaoCalculo";

interface VolumeItem {
  id: string;
  numero: number;
  codigoInterno: string;
  conferido: boolean;
  conferidoEm: string | null;
}

export default function ConferenciaClient({
  expedicaoId,
  ordemServicoId,
  numeroOS,
  clienteNome,
  volumes,
}: {
  expedicaoId: string;
  ordemServicoId: string;
  numeroOS: string;
  clienteNome: string;
  volumes: VolumeItem[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");

  const progresso = calcularProgressoConferencia(volumes);

  async function bipar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      const response = await fetch(`/api/expedicao/${expedicaoId}/conferir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoInterno: codigo }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao conferir volume");
        return;
      }
      setCodigo("");
      router.refresh();
      inputRef.current?.focus();
    } catch {
      setErro("Erro ao conferir volume — verifique sua conexão");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">
          Conferência de Expedição — OS {numeroOS}
        </h1>
        <Link href={`/ordens-servico/${ordemServicoId}`} className="text-sm text-ciano">
          Voltar para a OS
        </Link>
      </div>
      <p className="mb-4 text-sm text-gray-600">{clienteNome}</p>

      <p className="mb-4 text-sm text-gray-600">
        {progresso.conferidos} de {progresso.total} volumes conferidos
      </p>

      <form onSubmit={bipar} className="mb-6 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          autoFocus
          placeholder="Bipar ou digitar código do volume"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-ciano px-4 py-2 text-sm text-white">
          Conferir
        </button>
      </form>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2">Código</th>
            <th>Status</th>
            <th>Conferido em</th>
          </tr>
        </thead>
        <tbody>
          {volumes.map((volume) => (
            <tr key={volume.id} className="border-b">
              <td className="py-2">{volume.codigoInterno}</td>
              <td>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium text-white ${
                    volume.conferido ? "bg-ciano" : "bg-gray-400"
                  }`}
                >
                  {volume.conferido ? "Conferido" : "Pendente"}
                </span>
              </td>
              <td>
                {volume.conferidoEm ? new Date(volume.conferidoEm).toLocaleString("pt-BR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
