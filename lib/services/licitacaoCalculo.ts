export const STATUS_INTERNO_LICITACAO = [
  "ANALISANDO", "VAMOS_PARTICIPAR", "PROPOSTA_ENVIADA",
  "GANHAMOS", "PERDEMOS", "DESISTIMOS",
] as const;

export function propostaEncerrada(dataEncerramentoProposta: Date | string | null): boolean {
  if (!dataEncerramentoProposta) return false;
  return new Date(dataEncerramentoProposta) < new Date();
}
