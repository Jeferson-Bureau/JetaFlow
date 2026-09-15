import { prisma } from "@/lib/prisma";

export const PREFIXOS_PADRAO: Record<string, string> = {
  ORCAMENTO: "ORC",
  OS: "OS",
};

export async function alocarProximoNumero(tipoDocumento: string): Promise<string> {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento },
    update: {},
    create: {
      tipoDocumento,
      prefixo: PREFIXOS_PADRAO[tipoDocumento] ?? tipoDocumento,
      proximoNumero: 1,
      digitos: 4,
    },
  });

  const numeracao = await prisma.numeracaoDocumento.update({
    where: { tipoDocumento },
    data: { proximoNumero: { increment: 1 } },
  });
  const numeroAlocado = numeracao.proximoNumero - 1;
  return `${numeracao.prefixo}${String(numeroAlocado).padStart(numeracao.digitos, "0")}`;
}
