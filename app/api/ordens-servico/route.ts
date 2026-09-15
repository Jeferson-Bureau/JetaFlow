import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { listarOrdensServico } from "@/lib/services/ordemServicoService";

export async function GET(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const ordens = await listarOrdensServico(search);
    return NextResponse.json(ordens);
  } catch (error) {
    return handleApiError(error);
  }
}
