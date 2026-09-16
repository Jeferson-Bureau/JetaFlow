import { ServiceUnavailableError } from "@/lib/errors";

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

const MENSAGEM_PNCP_INDISPONIVEL =
  "Não foi possível consultar o PNCP no momento. Tente novamente em alguns minutos.";

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
  let response: { ok: boolean; status?: number; json: () => Promise<any> };
  try {
    response = await fetch(
      `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`,
      {
        headers: { "User-Agent": "JetaFlow/0.1 (+https://jetaprint.com.br)" },
        signal: AbortSignal.timeout(15000),
      }
    );
  } catch {
    // Rede fora do ar, DNS, timeout etc. — não é a mesma coisa que "licitação não existe".
    throw new ServiceUnavailableError(MENSAGEM_PNCP_INDISPONIVEL);
  }

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new ServiceUnavailableError(MENSAGEM_PNCP_INDISPONIVEL);
  }

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
}
