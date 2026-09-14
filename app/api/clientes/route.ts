import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { clienteSchema } from "@/lib/validators/cliente";
import { listClientes, createCliente } from "@/lib/services/clienteService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return NextResponse.json(await listClientes(search));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = clienteSchema.parse(await request.json());
    return NextResponse.json(await createCliente(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
