import { prisma } from "@/lib/prisma";
import { buscarOrdemServico } from "@/lib/services/ordemServicoService";
import { gerarCodigoInterno } from "@/lib/services/expedicaoCalculo";
import { NotFoundError } from "@/lib/errors";
import type { ExpedicaoInput } from "@/lib/validators/expedicao";
import type { Prisma } from "@prisma/client";

const INCLUDE_VOLUMES = {
  volumes: { orderBy: { numero: "asc" } },
} satisfies Prisma.ExpedicaoInclude;

export type ExpedicaoComVolumes = Prisma.ExpedicaoGetPayload<{
  include: typeof INCLUDE_VOLUMES;
}>;

export async function gerarExpedicao(
  ordemServicoId: string,
  input: ExpedicaoInput
): Promise<ExpedicaoComVolumes> {
  const os = await buscarOrdemServico(ordemServicoId);

  const enderecoData = {
    cep: input.cep ?? null,
    endereco: input.endereco ?? null,
    numero: input.numero ?? null,
    complemento: input.complemento ?? null,
    bairro: input.bairro ?? null,
    cidade: input.cidade ?? null,
    uf: input.uf ?? null,
  };

  return prisma.$transaction(async (tx) => {
    await tx.expedicao.deleteMany({ where: { ordemServicoId } });

    const volumesData = Array.from({ length: input.totalVolumes }, (_, i) => {
      const numero = i + 1;
      return { numero, codigoInterno: gerarCodigoInterno(os.numero, numero) };
    });

    return tx.expedicao.create({
      data: {
        ordemServicoId,
        totalVolumes: input.totalVolumes,
        ...enderecoData,
        volumes: { create: volumesData },
      },
      include: INCLUDE_VOLUMES,
    });
  });
}

export async function buscarExpedicaoPorOS(ordemServicoId: string): Promise<ExpedicaoComVolumes> {
  const expedicao = await prisma.expedicao.findUnique({
    where: { ordemServicoId },
    include: INCLUDE_VOLUMES,
  });
  if (!expedicao) throw new NotFoundError();
  return expedicao;
}

export async function buscarExpedicao(id: string): Promise<ExpedicaoComVolumes> {
  const expedicao = await prisma.expedicao.findUnique({
    where: { id },
    include: INCLUDE_VOLUMES,
  });
  if (!expedicao) throw new NotFoundError();
  return expedicao;
}
