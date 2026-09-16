import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { AcabamentoInput } from "@/lib/validators/acabamento";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar acabamentos");
}

type AcabamentoRow = Awaited<ReturnType<typeof prisma.acabamento.findFirstOrThrow>>;

function sanitize(acabamento: AcabamentoRow, role: Role | null) {
  if (isAdmin(role)) return acabamento;
  const { valorFixo, valorPorUnidade, ...rest } = acabamento;
  return rest;
}

export async function listAcabamentos(role: Role | null, search?: string) {
  const all = await prisma.acabamento.findMany({ orderBy: { nome: "asc" } });
  const filtered = search ? all.filter((a) => a.nome.toLowerCase().includes(search.toLowerCase())) : all;
  return filtered.map((a) => sanitize(a, role));
}

export async function getAcabamento(role: Role | null, id: string) {
  const acabamento = await prisma.acabamento.findUnique({ where: { id } });
  if (!acabamento) throw new NotFoundError("Acabamento não encontrado");
  return sanitize(acabamento, role);
}

export async function createAcabamento(role: Role | null, input: AcabamentoInput) {
  assertAdmin(role);
  return prisma.acabamento.create({ data: input });
}

export async function updateAcabamento(role: Role | null, id: string, input: AcabamentoInput) {
  assertAdmin(role);
  const existing = await prisma.acabamento.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Acabamento não encontrado");
  return prisma.acabamento.update({ where: { id }, data: input });
}

export async function deleteAcabamento(role: Role | null, id: string) {
  assertAdmin(role);
  const existing = await prisma.acabamento.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Acabamento não encontrado");
  await prisma.acabamento.delete({ where: { id } });
}
