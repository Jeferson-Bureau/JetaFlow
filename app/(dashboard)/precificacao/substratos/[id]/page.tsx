import { getSubstrato } from "@/lib/services/substratoService";
import { getSessionRole } from "@/lib/permissions";
import { NotFoundError } from "@/lib/errors";
import SubstratoForm from "@/components/forms/SubstratoForm";
import { notFound } from "next/navigation";
import type { tiposSubstrato } from "@/lib/validators/substrato";

export default async function EditarSubstratoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  let substrato;
  try {
    substrato = await getSubstrato(role, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const atributos = substrato.atributos as Record<string, string>;
  const { custoUnitario, markup } = substrato as { custoUnitario?: number; markup?: number };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar substrato</h1>
      <SubstratoForm
        initial={{
          id: substrato.id, nome: substrato.nome, tipo: substrato.tipo as (typeof tiposSubstrato)[number],
          fornecedorId: substrato.fornecedorId ?? "", unidadeMedida: substrato.unidadeMedida,
          custoUnitario: custoUnitario?.toString() ?? "",
          percentualPerda: substrato.percentualPerda.toString(),
          markup: markup?.toString() ?? "",
          atributos, ativo: substrato.ativo,
        }}
      />
    </div>
  );
}
