export const ESTAGIOS_OS = [
  "ARQUIVO_RECEBIDO",
  "PRE_IMPRESSAO",
  "PRODUCAO",
  "ACABAMENTO",
  "CONFERENCIA",
  "EMBALAGEM",
  "EXPEDICAO",
  "CONCLUIDO",
] as const;

export function estaAtrasada(estagio: string, prazoEntrega: Date | string | null): boolean {
  if (estagio === "CONCLUIDO" || !prazoEntrega) return false;
  const limite = new Date(prazoEntrega);
  limite.setUTCHours(23, 59, 59, 999);
  return limite < new Date();
}
