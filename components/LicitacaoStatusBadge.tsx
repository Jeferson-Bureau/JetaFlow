// components/LicitacaoStatusBadge.tsx
import { propostaEncerrada } from "@/lib/services/licitacaoCalculo";

const LABELS: Record<string, string> = {
  ANALISANDO: "Analisando",
  VAMOS_PARTICIPAR: "Vamos participar",
  PROPOSTA_ENVIADA: "Proposta enviada",
  GANHAMOS: "Ganhamos",
  PERDEMOS: "Perdemos",
  DESISTIMOS: "Desistimos",
};

const CORES: Record<string, string> = {
  ANALISANDO: "bg-gray-400",
  VAMOS_PARTICIPAR: "bg-ciano",
  PROPOSTA_ENVIADA: "bg-amarelo",
  GANHAMOS: "bg-ciano",
  PERDEMOS: "bg-rosa",
  DESISTIMOS: "bg-gray-400",
};

export default function LicitacaoStatusBadge({
  statusInterno,
  dataEncerramentoProposta,
}: {
  statusInterno: string;
  dataEncerramentoProposta: string | null;
}) {
  const encerrada = propostaEncerrada(dataEncerramentoProposta);
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`rounded px-2 py-1 text-xs font-medium text-white ${CORES[statusInterno] ?? "bg-gray-400"}`}
      >
        {LABELS[statusInterno] ?? statusInterno}
      </span>
      {encerrada && (
        <span className="rounded bg-rosa px-2 py-1 text-xs font-medium text-white">
          Proposta encerrada
        </span>
      )}
    </span>
  );
}
