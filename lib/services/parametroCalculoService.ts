import { prisma } from "@/lib/prisma";

export async function obterParametrosCalculo() {
  return prisma.parametroCalculo.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}
