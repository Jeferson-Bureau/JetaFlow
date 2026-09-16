export function gerarCodigoEtiquetaAvulsa(id: string, sequencial: number): string {
  return `AV${id.slice(0, 6).toUpperCase()}-${String(sequencial).padStart(2, "0")}`;
}
