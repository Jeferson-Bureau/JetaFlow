import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { listarExpedicoes } from "@/lib/services/expedicaoService";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const expedicoes = await listarExpedicoes();
    return NextResponse.json(expedicoes);
  } catch (error) {
    return handleApiError(error);
  }
}
