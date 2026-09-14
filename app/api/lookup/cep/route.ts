import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { lookupCep } from "@/lib/external/viacep";

export async function GET(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cep = new URL(request.url).searchParams.get("cep");
  if (!cep) return NextResponse.json({ error: "Parâmetro cep obrigatório" }, { status: 400 });

  const result = await lookupCep(cep);
  if (!result) return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
  return NextResponse.json(result);
}
