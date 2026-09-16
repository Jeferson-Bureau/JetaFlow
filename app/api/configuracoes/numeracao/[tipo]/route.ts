import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { numeracaoSchema } from "@/lib/validators/configuracao";
import { updateNumeracao } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function PUT(request: Request, props: { params: Promise<{ tipo: string }> }) {
  const params = await props.params;
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = numeracaoSchema.parse(await request.json());
    return NextResponse.json(await updateNumeracao(role, params.tipo, body));
  } catch (error) {
    return handleApiError(error);
  }
}
