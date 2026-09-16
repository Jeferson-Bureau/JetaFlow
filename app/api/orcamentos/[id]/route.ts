import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { orcamentoInputSchema } from "@/lib/validators/orcamento";
import { buscarOrcamento, atualizarOrcamento, excluirOrcamento } from "@/lib/services/orcamentoService";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await buscarOrcamento(params.id);
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const input = orcamentoInputSchema.parse(await request.json());
    const orcamento = await atualizarOrcamento(params.id, input);
    return NextResponse.json(orcamento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    await excluirOrcamento(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
