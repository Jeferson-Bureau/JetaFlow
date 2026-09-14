const cards = [
  { label: "Orçamentos pendentes", value: "—" },
  { label: "OS em produção", value: "—" },
  { label: "Pedidos aguardando expedição", value: "—" },
  { label: "Licitações em andamento", value: "—" },
];

export default function PainelPage() {
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
