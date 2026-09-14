import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { fornecedorSchema } from "@/lib/validators/fornecedor";
import { listFornecedores, createFornecedor } from "@/lib/services/fornecedorService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listFornecedores(search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = fornecedorSchema.parse(await request.json());
    return NextResponse.json(await createFornecedor(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
