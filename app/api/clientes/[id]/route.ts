import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { clienteSchema } from "@/lib/validators/cliente";
import { getCliente, updateCliente, deleteCliente } from "@/lib/services/clienteService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    return NextResponse.json(await getCliente(params.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = clienteSchema.parse(await request.json());
    return NextResponse.json(await updateCliente(params.id, body));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    await deleteCliente(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
