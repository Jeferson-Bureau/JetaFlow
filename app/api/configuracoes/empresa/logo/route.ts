import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSessionRole, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("logo") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "png";
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, `logo.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const logoUrl = `/uploads/logo.${ext}`;
  await prisma.configuracaoGeral.upsert({
    where: { id: 1 }, update: { logoUrl }, create: { id: 1, logoUrl },
  });

  return NextResponse.json({ logoUrl });
}
