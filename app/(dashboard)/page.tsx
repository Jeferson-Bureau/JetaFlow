import { listarOrcamentos, estaExpirado } from "@/lib/services/orcamentoService";
import { listarOrdensServico } from "@/lib/services/ordemServicoService";
import { listarLicitacoes } from "@/lib/services/licitacaoService";

const STATUS_LICITACAO_EM_ANDAMENTO = ["ANALISANDO", "VAMOS_PARTICIPAR", "PROPOSTA_ENVIADA"];

export default async function PainelPage() {
  const [orcamentos, ordensServico, licitacoes] = await Promise.all([
    listarOrcamentos(),
    listarOrdensServico(),
    listarLicitacoes(),
  ]);

  const orcamentosPendentes = orcamentos.filter(
    (o) => (o.status === "RASCUNHO" || o.status === "ENVIADO") && !estaExpirado(o)
  ).length;

  const osEmProducao = ordensServico.filter((os) => os.estagio !== "CONCLUIDO").length;

  const aguardandoExpedicao = ordensServico.filter((os) => os.estagio === "EXPEDICAO").length;

  const licitacoesEmAndamento = licitacoes.filter((l) =>
    STATUS_LICITACAO_EM_ANDAMENTO.includes(l.statusInterno)
  ).length;

  const cards = [
    { label: "Orçamentos pendentes", value: orcamentosPendentes },
    { label: "OS em produção", value: osEmProducao },
    { label: "Pedidos aguardando expedição", value: aguardandoExpedicao },
    { label: "Licitações em andamento", value: licitacoesEmAndamento },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Painel</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-ciano">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
