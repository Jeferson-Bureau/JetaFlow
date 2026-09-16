import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { acabamentoSchema } from "@/lib/validators/acabamento";
import { listAcabamentos, createAcabamento } from "@/lib/services/acabamentoService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listAcabamentos(role, search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = acabamentoSchema.parse(await request.json());
    return NextResponse.json(await createAcabamento(role, body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
