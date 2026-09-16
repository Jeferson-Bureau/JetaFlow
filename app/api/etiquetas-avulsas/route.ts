import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { etiquetaAvulsaInputSchema } from "@/lib/validators/etiquetaAvulsa";
import { criarEtiquetaAvulsa, listarEtiquetasAvulsas } from "@/lib/services/etiquetaAvulsaService";

export async function GET() {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    return NextResponse.json(await listarEtiquetasAvulsas());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = etiquetaAvulsaInputSchema.parse(await request.json());
    return NextResponse.json(await criarEtiquetaAvulsa(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
