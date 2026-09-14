import { prisma } from "@/lib/prisma";

export async function alocarProximoNumero(tipoDocumento: string): Promise<string> {
  const numeracao = await prisma.numeracaoDocumento.update({
    where: { tipoDocumento },
    data: { proximoNumero: { increment: 1 } },
  });
  const numeroAlocado = numeracao.proximoNumero - 1;
  return `${numeracao.prefixo}${String(numeroAlocado).padStart(numeracao.digitos, "0")}`;
}
