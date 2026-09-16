import { getAcabamento } from "@/lib/services/acabamentoService";
import { getSessionRole } from "@/lib/permissions";
import { NotFoundError } from "@/lib/errors";
import AcabamentoForm from "@/components/forms/AcabamentoForm";
import { notFound } from "next/navigation";
import type { categoriasAcabamento, tiposCalculoAcabamento } from "@/lib/validators/acabamento";

export default async function EditarAcabamentoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  let acabamento;
  try {
    acabamento = await getAcabamento(role, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const { valorFixo, valorPorUnidade } = acabamento as { valorFixo?: number | null; valorPorUnidade?: number | null };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar acabamento</h1>
      <AcabamentoForm
        initial={{
          id: acabamento.id,
          nome: acabamento.nome,
          categoria: acabamento.categoria as (typeof categoriasAcabamento)[number],
          tipoCalculo: acabamento.tipoCalculo as (typeof tiposCalculoAcabamento)[number],
          valorFixo: valorFixo?.toString() ?? "",
          valorPorUnidade: valorPorUnidade?.toString() ?? "",
          percentualPerda: acabamento.percentualPerda.toString(),
          ativo: acabamento.ativo,
        }}
      />
    </div>
  );
}
