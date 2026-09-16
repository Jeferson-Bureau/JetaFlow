export interface PncpContratacaoResult {
  orgaoNome: string;
  unidadeNome: string;
  numeroCompra: string;
  objetoCompra: string;
  modalidadeNome: string;
  situacaoCompraNome: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
}

export interface NumeroControlePNCPParseado {
  cnpj: string;
  ano: number;
  sequencial: number;
}

export function parseNumeroControlePNCP(numero: string): NumeroControlePNCPParseado | null {
  const match = numero.trim().match(/^(\d{14})-\d-(\d+)\/(\d{4})$/);
  if (!match) return null;
  return {
    cnpj: match[1],
    sequencial: parseInt(match[2], 10),
    ano: parseInt(match[3], 10),
  };
}

export async function buscarContratacaoPNCP(
  cnpj: string,
  ano: number,
  sequencial: number
): Promise<PncpContratacaoResult | null> {
  try {
    const response = await fetch(
      `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`,
      { headers: { "User-Agent": "JetaFlow/0.1 (+https://jetaprint.com.br)" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      orgaoNome: data.orgaoEntidade?.razaoSocial ?? "",
      unidadeNome: data.unidadeOrgao?.nomeUnidade ?? "",
      numeroCompra: data.numeroCompra ?? "",
      objetoCompra: data.objetoCompra ?? "",
      modalidadeNome: data.modalidadeNome ?? "",
      situacaoCompraNome: data.situacaoCompraNome ?? "",
      valorTotalEstimado: data.valorTotalEstimado ?? null,
      valorTotalHomologado: data.valorTotalHomologado ?? null,
      dataAberturaProposta: data.dataAberturaProposta ?? null,
      dataEncerramentoProposta: data.dataEncerramentoProposta ?? null,
    };
  } catch {
    return null;
  }
}
