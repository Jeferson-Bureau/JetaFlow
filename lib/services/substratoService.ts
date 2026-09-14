import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { SubstratoInput } from "@/lib/validators/substrato";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar precificação e substratos");
}

function parseAtributos(raw: string): Record<string, string | number> {
  return JSON.parse(raw);
}

type SubstratoRow = Awaited<ReturnType<typeof prisma.substrato.findFirstOrThrow>>;

function sanitize(substrato: SubstratoRow, role: Role | null) {
  const withParsedAtributos = { ...substrato, atributos: parseAtributos(substrato.atributos) };
  if (isAdmin(role)) return withParsedAtributos;
  const { custoUnitario, markup, ...rest } = withParsedAtributos;
  return rest;
}

export async function listSubstratos(role: Role | null, search?: string) {
  const all = await prisma.substrato.findMany({ orderBy: { nome: "asc" } });
  const filtered = search ? all.filter((s) => s.nome.toLowerCase().includes(search.toLowerCase())) : all;
  return filtered.map((s) => sanitize(s, role));
}

export async function getSubstrato(role: Role | null, id: string) {
  const substrato = await prisma.substrato.findUnique({ where: { id } });
  if (!substrato) throw new NotFoundError("Substrato não encontrado");
  return sanitize(substrato, role);
}

export async function createSubstrato(role: Role | null, input: SubstratoInput) {
  assertAdmin(role);
  const created = await prisma.substrato.create({ data: { ...input, atributos: JSON.stringify(input.atributos) } });
  return { ...created, atributos: parseAtributos(created.atributos) };
}

export async function updateSubstrato(role: Role | null, id: string, input: SubstratoInput) {
  assertAdmin(role);
  const existing = await prisma.substrato.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Substrato não encontrado");
  const updated = await prisma.substrato.update({
    where: { id }, data: { ...input, atributos: JSON.stringify(input.atributos) },
  });
  return { ...updated, atributos: parseAtributos(updated.atributos) };
}

export async function deleteSubstrato(role: Role | null, id: string) {
  assertAdmin(role);
  const existing = await prisma.substrato.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Substrato não encontrado");
  await prisma.substrato.delete({ where: { id } });
}
