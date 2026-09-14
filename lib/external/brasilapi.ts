export interface CnpjResult {
  razaoSocial: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function lookupCnpj(cnpj: string): Promise<CnpjResult | null> {
  const digits = cnpj.replace(/\D/g, "");
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { "User-Agent": "JetaFlow/0.1 (+https://jetaprint.com.br)" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      razaoSocial: data.razao_social ?? "",
      cep: data.cep ?? "",
      endereco: data.logradouro ?? "",
      numero: data.numero ?? "",
      bairro: data.bairro ?? "",
      cidade: data.municipio ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
