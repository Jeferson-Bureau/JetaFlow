import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { duplicarOrcamento } from "@/lib/services/orcamentoService";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const copia = await duplicarOrcamento(params.id);
    return NextResponse.json(copia, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
