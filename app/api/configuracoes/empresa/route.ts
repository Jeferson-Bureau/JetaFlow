import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { empresaSchema } from "@/lib/validators/configuracao";
import { getEmpresa, updateEmpresa } from "@/lib/services/configuracaoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getEmpresa(role));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = empresaSchema.parse(await request.json());
    return NextResponse.json(await updateEmpresa(role, body));
  } catch (error) {
    return handleApiError(error);
  }
}
