import { getEquipamento } from "@/lib/services/equipamentoService";
import { getSessionRole } from "@/lib/permissions";
import { NotFoundError } from "@/lib/errors";
import EquipamentoForm from "@/components/forms/EquipamentoForm";
import { notFound } from "next/navigation";
import type { tiposEquipamento } from "@/lib/validators/equipamento";

export default async function EditarEquipamentoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  let equipamento;
  try {
    equipamento = await getEquipamento(role, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const acabamentos = equipamento.acabamentosSuportados as string[];
  const { custoHora } = equipamento as { custoHora?: number };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar equipamento</h1>
      <EquipamentoForm
        initial={{
          id: equipamento.id, nome: equipamento.nome, tipo: equipamento.tipo as (typeof tiposEquipamento)[number],
          velocidade: equipamento.velocidade.toString(), unidadeVelocidade: equipamento.unidadeVelocidade,
          formatoMaximo: equipamento.formatoMaximo, custoHora: custoHora?.toString() ?? "",
          tempoSetupMin: equipamento.tempoSetupMin.toString(), percentualPerda: equipamento.percentualPerda.toString(),
          acabamentosSuportados: acabamentos.join(", "), ativo: equipamento.ativo,
        }}
      />
    </div>
  );
}
