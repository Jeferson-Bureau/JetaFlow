import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { usuarioSchema } from "@/lib/validators/usuario";
import { listUsuarios, createUsuario } from "@/lib/services/usuarioService";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const usuarios = await listUsuarios(role);
    return NextResponse.json(usuarios);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = await getSessionRole();
    if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = usuarioSchema.parse(await request.json());
    const usuario = await createUsuario(role, body);
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
