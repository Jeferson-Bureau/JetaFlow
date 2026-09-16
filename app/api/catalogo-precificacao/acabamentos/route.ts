import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { listAcabamentosComCusto } from "@/lib/services/catalogoPrecificacaoService";

export async function GET(_request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const acabamentos = await listAcabamentosComCusto();
    return NextResponse.json(acabamentos);
  } catch (error) {
    return handleApiError(error);
  }
}
