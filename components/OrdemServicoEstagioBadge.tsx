import { ESTAGIOS_OS, estaAtrasada } from "@/lib/services/ordemServicoCalculo";

const LABELS: Record<(typeof ESTAGIOS_OS)[number], string> = {
  ARQUIVO_RECEBIDO: "Arquivo recebido",
  PRE_IMPRESSAO: "Pré-impressão",
  PRODUCAO: "Produção",
  ACABAMENTO: "Acabamento",
  CONFERENCIA: "Conferência",
  EMBALAGEM: "Embalagem",
  EXPEDICAO: "Expedição",
  CONCLUIDO: "Concluído",
};

export default function OrdemServicoEstagioBadge({
  estagio,
  prazoEntrega,
}: {
  estagio: string;
  prazoEntrega: string | null;
}) {
  const atrasada = estaAtrasada(estagio, prazoEntrega);
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium text-white ${
        atrasada ? "bg-rosa" : "bg-ciano"
      }`}
    >
      {LABELS[estagio as (typeof ESTAGIOS_OS)[number]] ?? estagio}
      {atrasada && " — Atrasada"}
    </span>
  );
}
