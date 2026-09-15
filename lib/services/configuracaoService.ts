import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { PREFIXOS_PADRAO } from "@/lib/services/numeracaoService";
import type { Role } from "@/lib/types";
import type { EmpresaInput, NumeracaoInput, ParametrosInput } from "@/lib/validators/configuracao";

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

export async function listNumeracoes(role: Role | null) {
  assertAdmin(role);
  const tipos = ["ORCAMENTO", "OS"];
  for (const tipo of tipos) {
    await prisma.numeracaoDocumento.upsert({
      where: { tipoDocumento: tipo },
      update: {},
      create: { tipoDocumento: tipo, prefixo: PREFIXOS_PADRAO[tipo] ?? tipo, proximoNumero: 1, digitos: 4 },
    });
  }
  return prisma.numeracaoDocumento.findMany({ orderBy: { tipoDocumento: "asc" } });
}

export async function updateNumeracao(role: Role | null, tipoDocumento: string, input: NumeracaoInput) {
  assertAdmin(role);
  const existing = await prisma.numeracaoDocumento.findUnique({ where: { tipoDocumento } });
  if (!existing) throw new NotFoundError("Numeração não encontrada");
  return prisma.numeracaoDocumento.update({ where: { tipoDocumento }, data: input });
}

export async function getParametros(role: Role | null) {
  assertAdmin(role);
  return prisma.parametroCalculo.upsert({
    where: { id: 1 }, update: {}, create: { id: 1 },
  });
}

export async function updateParametros(role: Role | null, input: ParametrosInput) {
  assertAdmin(role);
  return prisma.parametroCalculo.upsert({
    where: { id: 1 }, update: input, create: { id: 1, ...input },
  });
}
