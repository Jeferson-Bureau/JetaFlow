import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { conferirVolume } from "@/lib/services/expedicaoService";
import { conferirVolumeInputSchema } from "@/lib/validators/expedicao";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const input = conferirVolumeInputSchema.parse(body);
    const expedicao = await conferirVolume(params.id, input.codigoInterno);
    return NextResponse.json(expedicao);
  } catch (error) {
    return handleApiError(error);
  }
}
