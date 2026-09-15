import { prisma } from "@/lib/prisma";

export async function listSubstratosComCusto() {
  return prisma.substrato.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      custoUnitario: true,
      percentualPerda: true,
      markup: true,
    },
  });
}

export async function listEquipamentosComCusto() {
  return prisma.equipamento.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      velocidade: true,
      tempoSetupMin: true,
      custoHora: true,
      percentualPerda: true,
    },
  });
}
