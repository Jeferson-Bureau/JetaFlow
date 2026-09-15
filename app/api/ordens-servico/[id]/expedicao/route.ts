import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { gerarExpedicao, buscarExpedicaoPorOS } from "@/lib/services/expedicaoService";
import { expedicaoInputSchema } from "@/lib/validators/expedicao";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json();
    const input = expedicaoInputSchema.parse(body);
    const expedicao = await gerarExpedicao(params.id, input);
    return NextResponse.json(expedicao, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const expedicao = await buscarExpedicaoPorOS(params.id);
    return NextResponse.json(expedicao);
  } catch (error) {
    return handleApiError(error);
  }
}
