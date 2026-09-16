import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { EtiquetaAvulsaInput } from "@/lib/validators/etiquetaAvulsa";
import type { EtiquetaAvulsa } from "@prisma/client";

export async function criarEtiquetaAvulsa(input: EtiquetaAvulsaInput): Promise<EtiquetaAvulsa> {
  return prisma.etiquetaAvulsa.create({ data: input });
}

export async function listarEtiquetasAvulsas(): Promise<EtiquetaAvulsa[]> {
  return prisma.etiquetaAvulsa.findMany({ orderBy: { createdAt: "desc" } });
}

export async function buscarEtiquetaAvulsa(id: string): Promise<EtiquetaAvulsa> {
  const etiqueta = await prisma.etiquetaAvulsa.findUnique({ where: { id } });
  if (!etiqueta) throw new NotFoundError();
  return etiqueta;
}
