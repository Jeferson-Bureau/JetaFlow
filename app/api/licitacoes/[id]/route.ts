import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarLicitacao, atualizarDadosInternos, excluirLicitacao } from "@/lib/services/licitacaoService";
import { licitacaoInternoInputSchema } from "@/lib/validators/licitacao";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const licitacao = await buscarLicitacao(params.id);
    return NextResponse.json(licitacao);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const input = licitacaoInternoInputSchema.parse(body);
    const licitacao = await atualizarDadosInternos(params.id, input);
    return NextResponse.json(licitacao);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    await excluirLicitacao(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
