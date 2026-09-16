import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { atualizarDadosPNCP } from "@/lib/services/licitacaoService";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const licitacao = await atualizarDadosPNCP(params.id);
    return NextResponse.json(licitacao);
  } catch (error) {
    return handleApiError(error);
  }
}
