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

export interface DivergenciaItem {
  orcamentoItemId: string;
  descricao: string;
  tiragem: number;
  somaVolumes: number;
  divergente: boolean;
}

export function calcularDivergenciasPorItem(
  itens: { id: string; descricao: string; tiragem: number }[],
  volumes: { orcamentoItemId: string | null; quantidade: number }[]
): DivergenciaItem[] {
  return itens.map((item) => {
    const somaVolumes = volumes
      .filter((v) => v.orcamentoItemId === item.id)
      .reduce((soma, v) => soma + v.quantidade, 0);
    return {
      orcamentoItemId: item.id,
      descricao: item.descricao,
      tiragem: item.tiragem,
      somaVolumes,
      divergente: somaVolumes !== item.tiragem,
    };
  });
}
