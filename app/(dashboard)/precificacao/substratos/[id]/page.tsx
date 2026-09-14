import { prisma } from "@/lib/prisma";
import SubstratoForm from "@/components/forms/SubstratoForm";
import { notFound } from "next/navigation";
import type { tiposSubstrato } from "@/lib/validators/substrato";

export default async function EditarSubstratoPage({ params }: { params: { id: string } }) {
  const substrato = await prisma.substrato.findUnique({ where: { id: params.id } });
  if (!substrato) notFound();

  const atributos = JSON.parse(substrato.atributos) as Record<string, string>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar substrato</h1>
      <SubstratoForm
        initial={{
          id: substrato.id, nome: substrato.nome, tipo: substrato.tipo as (typeof tiposSubstrato)[number],
          fornecedorId: substrato.fornecedorId ?? "", unidadeMedida: substrato.unidadeMedida,
          custoUnitario: substrato.custoUnitario.toString(), percentualPerda: substrato.percentualPerda.toString(),
          markup: substrato.markup.toString(), atributos, ativo: substrato.ativo,
        }}
      />
    </div>
  );
}
