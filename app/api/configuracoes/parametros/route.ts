import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { parametrosSchema } from "@/lib/validators/configuracao";
import { getParametros, updateParametros } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getParametros(role));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = parametrosSchema.parse(await request.json());
    return NextResponse.json(await updateParametros(role, body));
  } catch (error) {
    return handleApiError(error);
  }
}
