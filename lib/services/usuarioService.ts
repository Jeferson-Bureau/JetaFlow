import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { UsuarioInput } from "@/lib/validators/usuario";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores podem gerenciar usuários");
}

export async function listUsuarios(role: Role | null) {
  assertAdmin(role);
  return prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, ativo: true },
    orderBy: { nome: "asc" },
  });
}

export async function createUsuario(role: Role | null, input: UsuarioInput) {
  assertAdmin(role);
  if (!input.senha) throw new Error("Senha obrigatória ao criar usuário");
  const senhaHash = await hashPassword(input.senha);
  return prisma.user.create({
    data: { nome: input.nome, email: input.email, senhaHash, role: input.role, ativo: input.ativo },
    select: { id: true, nome: true, email: true, role: true, ativo: true },
  });
}

export async function updateUsuario(role: Role | null, id: string, input: UsuarioInput) {
  assertAdmin(role);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Usuário não encontrado");

  const senhaHash = input.senha ? await hashPassword(input.senha) : existing.senhaHash;
  return prisma.user.update({
    where: { id },
    data: { nome: input.nome, email: input.email, senhaHash, role: input.role, ativo: input.ativo },
    select: { id: true, nome: true, email: true, role: true, ativo: true },
  });
}
