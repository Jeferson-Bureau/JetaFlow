import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { obterParametrosCalculo } from "@/lib/services/parametroCalculoService";

export async function GET(_request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const parametros = await obterParametrosCalculo();
    return NextResponse.json(parametros);
  } catch (error) {
    return handleApiError(error);
  }
}
