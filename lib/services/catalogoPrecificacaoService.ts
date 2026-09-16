import { prisma } from "@/lib/prisma";

export async function listSubstratosComCusto() {
  return prisma.substrato.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      unidadeMedida: true,
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

export async function listAcabamentosComCusto() {
  return prisma.acabamento.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      categoria: true,
      tipoCalculo: true,
      valorFixo: true,
      valorPorUnidade: true,
      percentualPerda: true,
    },
  });
}
