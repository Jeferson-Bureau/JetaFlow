"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ExpedicaoListada {
  id: string;
  ordemServicoId: string;
  numeroOS: string;
  clienteNome: string;
  totalVolumes: number;
  volumesConferidos: number;
  createdAt: string;
}

export default function EtiquetasPage() {
  const [expedicoes, setExpedicoes] = useState<ExpedicaoListada[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/expedicao")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setExpedicoes(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar etiquetas");
      })
      .catch(() => setErro("Erro ao carregar etiquetas"));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Etiquetas</h1>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      {!erro && expedicoes.length === 0 && (
        <p className="text-sm text-gray-500">
          Nenhuma etiqueta gerada ainda. Gere etiquetas a partir de uma Ordem de Serviço.
        </p>
      )}

      {expedicoes.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2">OS</th>
              <th>Cliente</th>
              <th>Volumes conferidos</th>
              <th>Conferência</th>
              <th>Etiquetas (PDF)</th>
            </tr>
          </thead>
          <tbody>
            {expedicoes.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="py-2">
                  <Link href={`/ordens-servico/${e.ordemServicoId}`} className="text-ciano">
                    {e.numeroOS}
                  </Link>
                </td>
                <td>{e.clienteNome}</td>
                <td>
                  {e.volumesConferidos}/{e.totalVolumes}
                </td>
                <td>
                  <Link href={`/expedicao/${e.id}/conferencia`} className="text-ciano">
                    Conferir
                  </Link>
                </td>
                <td>
                  <a
                    href={`/api/expedicao/${e.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ciano"
                  >
                    Baixar
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
