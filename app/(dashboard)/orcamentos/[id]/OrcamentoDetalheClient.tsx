"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OrcamentoForm, { type OrcamentoFormInitial } from "@/components/forms/OrcamentoForm";

interface OrcamentoDetalheClientProps {
  id: string;
  numero: string;
  status: string;
  clienteNome: string;
  clienteTelefone: string | null;
  initial: OrcamentoFormInitial;
}

export default function OrcamentoDetalheClient({
  id,
  numero,
  status,
  clienteNome,
  clienteTelefone,
  initial,
}: OrcamentoDetalheClientProps) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function chamarAcao(acao: "enviar" | "aprovar" | "duplicar") {
    setErro("");
    setCarregando(true);
    const response = await fetch(`/api/orcamentos/${id}/${acao}`, { method: "POST" });
    setCarregando(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.error ?? "Erro ao executar ação");
      return;
    }

    if (acao === "duplicar") {
      const copia = await response.json();
      router.push(`/orcamentos/${copia.id}`);
    } else {
      router.refresh();
    }
  }

  function enviarPorWhatsApp() {
    window.open(`/api/orcamentos/${id}/pdf`, "_blank");
    const telefoneDigits = (clienteTelefone ?? "").replace(/\D/g, "");
    const mensagem = encodeURIComponent(
      `Olá ${clienteNome}, segue o orçamento ${numero} da JETAPRINT.`
    );
    window.open(`https://wa.me/${telefoneDigits}?text=${mensagem}`, "_blank");
    chamarAcao("enviar");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">
          Orçamento {numero} — {status}
        </h1>
        <div className="flex gap-2">
          <a
            href={`/api/orcamentos/${id}/pdf`}
            className="rounded border border-ciano px-3 py-2 text-sm text-ciano"
          >
            Baixar PDF
          </a>
          {status === "RASCUNHO" && (
            <button
              type="button"
              disabled={carregando}
              onClick={enviarPorWhatsApp}
              className="rounded border border-ciano px-3 py-2 text-sm text-ciano"
            >
              Enviar por WhatsApp
            </button>
          )}
          {status === "ENVIADO" && (
            <button
              type="button"
              disabled={carregando}
              onClick={() => chamarAcao("aprovar")}
              className="rounded bg-ciano px-3 py-2 text-sm text-white"
            >
              Marcar como aprovado
            </button>
          )}
          <button
            type="button"
            disabled={carregando}
            onClick={() => chamarAcao("duplicar")}
            className="rounded border px-3 py-2 text-sm"
          >
            Duplicar
          </button>
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-rosa">{erro}</p>}

      {status === "APROVADO" ? (
        <p className="text-sm text-gray-500">
          Orçamento aprovado — os itens não podem mais ser editados.
        </p>
      ) : (
        <OrcamentoForm initial={initial} />
      )}
    </div>
  );
}
