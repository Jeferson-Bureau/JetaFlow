import { prisma } from "@/lib/prisma";
import ClienteForm from "@/components/forms/ClienteForm";
import { notFound } from "next/navigation";

export default async function EditarClientePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cliente = await prisma.cliente.findUnique({ where: { id: params.id } });
  if (!cliente) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar cliente</h1>
      <ClienteForm
        initial={{
          id: cliente.id, tipo: cliente.tipo as "PF" | "PJ", nome: cliente.nome,
          nomeFantasia: cliente.nomeFantasia ?? "", documento: cliente.documento,
          ie: cliente.ie ?? "", telefone: cliente.telefone ?? "", email: cliente.email ?? "",
          cep: cliente.cep ?? "", endereco: cliente.endereco ?? "", numero: cliente.numero ?? "",
          complemento: cliente.complemento ?? "", bairro: cliente.bairro ?? "", cidade: cliente.cidade ?? "",
          uf: cliente.uf ?? "", prazoPagamento: cliente.prazoPagamento?.toString() ?? "",
          observacoes: cliente.observacoes ?? "",
        }}
      />
    </div>
  );
}
