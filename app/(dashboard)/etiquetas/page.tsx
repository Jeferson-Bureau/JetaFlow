"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EtiquetaAvulsaForm, { type EtiquetaAvulsaCriada } from "@/components/forms/EtiquetaAvulsaForm";

interface ExpedicaoListada {
  id: string;
  ordemServicoId: string;
  numeroOS: string;
  clienteNome: string;
  totalVolumes: number;
  volumesConferidos: number;
  createdAt: string;
}

interface EtiquetaAvulsaListada {
  id: string;
  descricao: string;
  quantidade: number;
  createdAt: string;
}

export default function EtiquetasPage() {
  const [expedicoes, setExpedicoes] = useState<ExpedicaoListada[]>([]);
  const [erro, setErro] = useState("");

  const [avulsas, setAvulsas] = useState<EtiquetaAvulsaListada[]>([]);
  const [erroAvulsas, setErroAvulsas] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    fetch("/api/expedicao")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setExpedicoes(Array.isArray(data) ? data : []);
        setErro(Array.isArray(data) ? "" : "Erro ao carregar etiquetas");
      })
      .catch(() => setErro("Erro ao carregar etiquetas"));
  }, []);

  useEffect(() => {
    fetch("/api/etiquetas-avulsas")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setAvulsas(Array.isArray(data) ? data : []);
        setErroAvulsas(Array.isArray(data) ? "" : "Erro ao carregar etiquetas avulsas");
      })
      .catch(() => setErroAvulsas("Erro ao carregar etiquetas avulsas"));
  }, []);

  function handleCreated(etiqueta: EtiquetaAvulsaCriada) {
    setAvulsas((atuais) => [etiqueta, ...atuais]);
    setMostrarForm(false);
  }

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
        <table className="mb-8 w-full text-left text-sm">
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

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-marinho">Etiquetas Avulsas</h2>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded bg-ciano px-4 py-2 text-sm text-white"
        >
          {mostrarForm ? "Cancelar" : "Nova etiqueta avulsa"}
        </button>
      </div>

      {mostrarForm && <EtiquetaAvulsaForm onCreated={handleCreated} />}

      {erroAvulsas && <p className="mb-4 text-sm text-rosa">{erroAvulsas}</p>}

      {!erroAvulsas && avulsas.length === 0 && (
        <p className="text-sm text-gray-500">Nenhuma etiqueta avulsa cadastrada ainda.</p>
      )}

      {avulsas.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2">Descrição</th>
              <th>Quantidade</th>
              <th>Criado em</th>
              <th>Etiquetas (PDF)</th>
            </tr>
          </thead>
          <tbody>
            {avulsas.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{e.descricao}</td>
                <td>{e.quantidade}</td>
                <td>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</td>
                <td>
                  <a
                    href={`/api/etiquetas-avulsas/${e.id}/pdf`}
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
