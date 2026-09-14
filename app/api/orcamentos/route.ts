import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { orcamentoInputSchema } from "@/lib/validators/orcamento";
import { criarOrcamento, listarOrcamentos } from "@/lib/services/orcamentoService";

export async function GET(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const orcamentos = await listarOrcamentos(search);
    return NextResponse.json(orcamentos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const input = orcamentoInputSchema.parse(await request.json());
    const orcamento = await criarOrcamento(input);
    return NextResponse.json(orcamento, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
