import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { usuarioSchema } from "@/lib/validators/usuario";
import { updateUsuario } from "@/lib/services/usuarioService";
import { handleApiError } from "@/lib/api-helpers";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = usuarioSchema.parse(await request.json());
    const usuario = await updateUsuario(role, params.id, body);
    return NextResponse.json(usuario);
  } catch (error) {
    return handleApiError(error);
  }
}
