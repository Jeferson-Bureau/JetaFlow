import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { cadastrarLicitacao, listarLicitacoes } from "@/lib/services/licitacaoService";
import { licitacaoInputSchema } from "@/lib/validators/licitacao";

export async function GET(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const licitacoes = await listarLicitacoes(search);
    return NextResponse.json(licitacoes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const input = licitacaoInputSchema.parse(body);
    const licitacao = await cadastrarLicitacao(input.numeroControlePNCP);
    return NextResponse.json(licitacao, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
