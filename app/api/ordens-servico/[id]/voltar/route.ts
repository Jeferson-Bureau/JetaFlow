import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { voltarEstagio } from "@/lib/services/ordemServicoService";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const ordem = await voltarEstagio(params.id);
    return NextResponse.json(ordem);
  } catch (error) {
    return handleApiError(error);
  }
}
