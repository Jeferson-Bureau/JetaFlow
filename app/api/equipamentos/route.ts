import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { equipamentoSchema } from "@/lib/validators/equipamento";
import { listEquipamentos, createEquipamento } from "@/lib/services/equipamentoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listEquipamentos(role, search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = equipamentoSchema.parse(await request.json());
    return NextResponse.json(await createEquipamento(role, body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
