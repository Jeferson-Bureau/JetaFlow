export function gerarCodigoInterno(numeroOS: string, volumeNumero: number): string {
  return `${numeroOS}-${String(volumeNumero).padStart(2, "0")}`;
}

export function calcularProgressoConferencia(
  volumes: { conferido: boolean }[]
): { conferidos: number; total: number } {
  return {
    conferidos: volumes.filter((v) => v.conferido).length,
    total: volumes.length,
  };
}
