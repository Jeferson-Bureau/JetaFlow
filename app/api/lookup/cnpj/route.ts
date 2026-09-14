import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { lookupCnpj } from "@/lib/external/brasilapi";

export async function GET(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cnpj = new URL(request.url).searchParams.get("cnpj");
  if (!cnpj) return NextResponse.json({ error: "Parâmetro cnpj obrigatório" }, { status: 400 });

  const result = await lookupCnpj(cnpj);
  if (!result) return NextResponse.json({ error: "CNPJ não encontrado" }, { status: 404 });
  return NextResponse.json(result);
}
