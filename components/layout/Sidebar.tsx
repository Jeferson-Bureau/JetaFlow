import Link from "next/link";

const modules = [
  { href: "/", label: "Painel" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/ordens-servico", label: "Ordens de Serviço" },
  { href: "/clientes", label: "Clientes" },
  { href: "/fornecedores", label: "Fornecedores" },
  { href: "/etiquetas", label: "Etiquetas" },
  { href: "/licitacoes", label: "Licitações" },
  { href: "/precificacao", label: "Precificação" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function Sidebar() {
  return (
    <nav className="w-56 shrink-0 border-r bg-marinho text-white">
      <ul className="space-y-1 p-4">
        {modules.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="block rounded px-3 py-2 hover:bg-ciano">
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
