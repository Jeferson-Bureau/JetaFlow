import { prisma } from "@/lib/prisma";
import { buscarOrdemServico } from "@/lib/services/ordemServicoService";
import { gerarCodigoInterno } from "@/lib/services/expedicaoCalculo";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { ExpedicaoInput } from "@/lib/validators/expedicao";
import type { Prisma } from "@prisma/client";

const INCLUDE_VOLUMES = {
  volumes: {
    orderBy: { numero: "asc" },
    include: { orcamentoItem: { select: { id: true, descricao: true } } },
  },
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

    const volumesData = input.volumes.map((volume, i) => {
      const numero = i + 1;
      return {
        numero,
        codigoInterno: gerarCodigoInterno(os.numero, numero),
        quantidade: volume.quantidade,
        orcamentoItemId: volume.orcamentoItemId ?? null,
      };
    });

    return tx.expedicao.create({
      data: {
        ordemServicoId,
        ...enderecoData,
        volumes: { create: volumesData },
      },
      include: INCLUDE_VOLUMES,
    });
  });
}

export interface ExpedicaoListada {
  id: string;
  ordemServicoId: string;
  numeroOS: string;
  clienteNome: string;
  totalVolumes: number;
  volumesConferidos: number;
  createdAt: Date;
}

export async function listarExpedicoes(): Promise<ExpedicaoListada[]> {
  const expedicoes = await prisma.expedicao.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ordemServicoId: true,
      createdAt: true,
      ordemServico: {
        select: {
          numero: true,
          orcamento: { select: { cliente: { select: { nome: true } } } },
        },
      },
      volumes: { select: { conferido: true } },
    },
  });

  return expedicoes.map((e) => ({
    id: e.id,
    ordemServicoId: e.ordemServicoId,
    numeroOS: e.ordemServico.numero,
    clienteNome: e.ordemServico.orcamento.cliente.nome,
    totalVolumes: e.volumes.length,
    volumesConferidos: e.volumes.filter((v) => v.conferido).length,
    createdAt: e.createdAt,
  }));
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

export async function conferirVolume(
  expedicaoId: string,
  codigoInterno: string
): Promise<ExpedicaoComVolumes> {
  const volume = await prisma.volume.findUnique({ where: { codigoInterno } });
  if (!volume || volume.expedicaoId !== expedicaoId) {
    throw new NotFoundError("Código não encontrado nesta expedição");
  }
  if (volume.conferido) {
    throw new ForbiddenError("Este volume já foi conferido");
  }

  await prisma.volume.update({
    where: { id: volume.id },
    data: { conferido: true, conferidoEm: new Date() },
  });

  return buscarExpedicao(expedicaoId);
}
