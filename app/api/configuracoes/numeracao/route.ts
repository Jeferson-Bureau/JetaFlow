import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { listNumeracoes } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await listNumeracoes(role));
  } catch (error) {
    return handleApiError(error);
  }
}
