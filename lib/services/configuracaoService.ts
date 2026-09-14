import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import type { EmpresaInput } from "@/lib/validators/configuracao";

function assertAdmin(role: Role | null) {
  if (!isAdmin(role)) throw new ForbiddenError("Apenas administradores acessam Configurações");
}

export async function getEmpresa(role: Role | null) {
  assertAdmin(role);
  return prisma.configuracaoGeral.upsert({
    where: { id: 1 }, update: {}, create: { id: 1 },
  });
}

export async function updateEmpresa(role: Role | null, input: EmpresaInput) {
  assertAdmin(role);
  return prisma.configuracaoGeral.upsert({
    where: { id: 1 }, update: input, create: { id: 1, ...input },
  });
}
