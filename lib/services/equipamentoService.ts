import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { EquipamentoInput } from "@/lib/validators/equipamento";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar equipamentos");
}

function parseAcabamentos(raw: string): string[] {
  return JSON.parse(raw);
}

type EquipamentoRow = Awaited<ReturnType<typeof prisma.equipamento.findFirstOrThrow>>;

function sanitize(equipamento: EquipamentoRow, role: Role | null) {
  const parsed = { ...equipamento, acabamentosSuportados: parseAcabamentos(equipamento.acabamentosSuportados) };
  if (isAdmin(role)) return parsed;
  const { custoHora, ...rest } = parsed;
  return rest;
}

export async function listEquipamentos(role: Role | null, search?: string) {
  const all = await prisma.equipamento.findMany({ orderBy: { nome: "asc" } });
  const filtered = search ? all.filter((e) => e.nome.toLowerCase().includes(search.toLowerCase())) : all;
  return filtered.map((e) => sanitize(e, role));
}

export async function getEquipamento(role: Role | null, id: string) {
  const equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (!equipamento) throw new NotFoundError("Equipamento não encontrado");
  return sanitize(equipamento, role);
}

export async function createEquipamento(role: Role | null, input: EquipamentoInput) {
  assertAdmin(role);
  const created = await prisma.equipamento.create({
    data: { ...input, acabamentosSuportados: JSON.stringify(input.acabamentosSuportados) },
  });
  return { ...created, acabamentosSuportados: parseAcabamentos(created.acabamentosSuportados) };
}

export async function updateEquipamento(role: Role | null, id: string, input: EquipamentoInput) {
  assertAdmin(role);
  const existing = await prisma.equipamento.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Equipamento não encontrado");
  const updated = await prisma.equipamento.update({
    where: { id }, data: { ...input, acabamentosSuportados: JSON.stringify(input.acabamentosSuportados) },
  });
  return { ...updated, acabamentosSuportados: parseAcabamentos(updated.acabamentosSuportados) };
}

export async function deleteEquipamento(role: Role | null, id: string) {
  assertAdmin(role);
  const existing = await prisma.equipamento.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Equipamento não encontrado");
  await prisma.equipamento.delete({ where: { id } });
}
