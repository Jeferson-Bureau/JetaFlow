import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { listSubstratosComCusto } from "@/lib/services/catalogoPrecificacaoService";

export async function GET(_request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const substratos = await listSubstratosComCusto();
    return NextResponse.json(substratos);
  } catch (error) {
    return handleApiError(error);
  }
}
