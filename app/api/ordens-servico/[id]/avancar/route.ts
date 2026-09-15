import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { avancarEstagio } from "@/lib/services/ordemServicoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordem = await avancarEstagio(params.id);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}
