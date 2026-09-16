import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { ordemServicoInputSchema } from "@/lib/validators/ordemServico";
import { buscarOrdemServico, atualizarOrdemServico } from "@/lib/services/ordemServicoService";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordem = await buscarOrdemServico(params.id);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const input = ordemServicoInputSchema.parse(await request.json());
    const ordem = await atualizarOrdemServico(params.id, input);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}
