import { sugerirAproveitamento, sugerirAproveitamentoDigital } from "@/lib/services/aproveitamentoPapel";

export interface SubstratoParaCalculo {
  custoUnitario: number;
  percentualPerda: number;
  markup: number;
  unidadeMedida?: string;
}

export interface EquipamentoParaCalculo {
  velocidade: number;
  tempoSetupMin: number;
  custoHora: number;
  percentualPerda: number;
}

export interface ParametrosParaCalculo {
  custoMaoObraHoraPadrao: number;
  percentualCustosIndiretosPadrao: number;
  impostosPercentualPadrao: number;
  comissaoPercentualPadrao: number;
  despesasFinanceirasPercentualPadrao: number;
}

export interface AcabamentoParaCalculo {
  tipoCalculo: string;
  valorFixo: number | null;
  valorPorUnidade: number | null;
  percentualPerda: number;
}

export interface ItemAcabamentoInput {
  acabamento?: AcabamentoParaCalculo | null;
  quantidade?: number | null;
  valorAvulso?: number | null;
}

export interface ItemCalculoInput {
  tipo: "DIGITAL" | "OFFSET";
  substrato: SubstratoParaCalculo;
  larguraCm: number;
  alturaCm: number;
  tiragem: number;
  equipamento: EquipamentoParaCalculo;
  chapa?: SubstratoParaCalculo | null;
  coresFrente?: number | null;
  coresVerso?: number | null;
  tinta?: SubstratoParaCalculo | null;
  tintaQuantidade?: number | null;
  substratoFolhas?: number | null;
  acabamentoCustoTotal: number;
  tipoMarkup: "MULTIPLICADOR" | "DIVISOR";
  margemLucro: number;
  parametros: ParametrosParaCalculo;
}

export interface ItemCalculoResultado {
  custoCalculado: number;
  precoFinal: number;
  chapaQuantidade: number | null;
  substratoFolhas: number | null;
}

export function calcularQuantidadeChapas(coresFrente?: number | null, coresVerso?: number | null): number {
  return (coresFrente ?? 0) + (coresVerso ?? 0);
}

export function calcularSubstratoFolhas(
  tipo: "DIGITAL" | "OFFSET",
  substratoFolhasInformado: number | null | undefined,
  larguraCm: number,
  alturaCm: number,
  tiragem: number
): number {
  if (substratoFolhasInformado && substratoFolhasInformado > 0) return substratoFolhasInformado;
  const sugestoes =
    tipo === "OFFSET"
      ? sugerirAproveitamento(larguraCm, alturaCm, tiragem)
      : sugerirAproveitamentoDigital(larguraCm, alturaCm, tiragem);
  const melhor = sugestoes[0];
  if (!melhor) {
    throw new Error(
      "Não foi possível calcular o aproveitamento automaticamente para este formato; informe a quantidade de folhas manualmente"
    );
  }
  return melhor.folhasNecessarias;
}

export function calcularPrecoFinal(
  custoCalculado: number,
  tipoMarkup: "MULTIPLICADOR" | "DIVISOR",
  margemLucro: number,
  parametros: ParametrosParaCalculo
): number {
  if (tipoMarkup === "MULTIPLICADOR") {
    return custoCalculado * (1 + margemLucro / 100);
  }
  const markupDivisor =
    1 -
    (parametros.impostosPercentualPadrao +
      parametros.comissaoPercentualPadrao +
      parametros.despesasFinanceirasPercentualPadrao +
      margemLucro) /
      100;
  if (markupDivisor <= 0) {
    throw new Error(
      "Markup divisor inválido: a soma de impostos, comissão, despesas financeiras e lucro desejado deve ser menor que 100%"
    );
  }
  return custoCalculado / markupDivisor;
}

export function calcularItem(input: ItemCalculoInput): ItemCalculoResultado {
  if (input.larguraCm <= 0 || input.alturaCm <= 0 || input.tiragem <= 0) {
    throw new Error("Largura, altura e tiragem devem ser maiores que zero");
  }
  if (input.equipamento.velocidade <= 0) {
    throw new Error("Velocidade do equipamento deve ser maior que zero");
  }
  if (input.tipo === "DIGITAL" && (input.chapa || input.tinta)) {
    throw new Error("Item DIGITAL não pode ter chapa ou tinta");
  }
  if (input.tipo === "OFFSET" && input.chapa && !(input.coresFrente && input.coresFrente > 0)) {
    throw new Error("Informe as cores da frente para calcular a quantidade de chapas");
  }

  const substratoPorFolha = input.substrato.unidadeMedida === "folha";
  const substratoFolhas = substratoPorFolha
    ? calcularSubstratoFolhas(input.tipo, input.substratoFolhas, input.larguraCm, input.alturaCm, input.tiragem)
    : null;

  const areaM2 = (input.larguraCm / 100) * (input.alturaCm / 100);
  const custoSubstrato =
    (substratoPorFolha ? substratoFolhas! : areaM2 * input.tiragem) *
    input.substrato.custoUnitario *
    (1 + input.substrato.percentualPerda / 100) *
    (1 + input.substrato.markup / 100);

  const chapaQuantidade =
    input.tipo === "OFFSET" && input.chapa
      ? calcularQuantidadeChapas(input.coresFrente, input.coresVerso)
      : null;
  const custoChapa = chapaQuantidade && input.chapa ? chapaQuantidade * input.chapa.custoUnitario : 0;

  const custoTinta =
    input.tipo === "OFFSET" && input.tinta && input.tintaQuantidade
      ? input.tintaQuantidade * input.tinta.custoUnitario
      : 0;

  const tempoMinMaquina =
    input.tiragem / input.equipamento.velocidade + input.equipamento.tempoSetupMin;
  const custoMaquina =
    (tempoMinMaquina / 60) *
    input.equipamento.custoHora *
    (1 + input.equipamento.percentualPerda / 100);

  const custoAcabamento = input.acabamentoCustoTotal;

  const custoMaoObra = (tempoMinMaquina / 60) * input.parametros.custoMaoObraHoraPadrao;

  const subtotalAntesIndireto =
    custoSubstrato + custoChapa + custoTinta + custoMaquina + custoAcabamento + custoMaoObra;
  const custoIndireto =
    subtotalAntesIndireto * (input.parametros.percentualCustosIndiretosPadrao / 100);

  const custoCalculado = subtotalAntesIndireto + custoIndireto;
  const precoFinal = calcularPrecoFinal(custoCalculado, input.tipoMarkup, input.margemLucro, input.parametros);

  return { custoCalculado, precoFinal, chapaQuantidade, substratoFolhas };
}

export function calcularCustoAcabamento(item: ItemAcabamentoInput, tiragem: number): number {
  if (item.acabamento) {
    const perda = 1 + item.acabamento.percentualPerda / 100;
    if (item.acabamento.tipoCalculo === "FIXO") {
      return (item.acabamento.valorFixo ?? 0) * perda;
    }
    const quantidade = item.quantidade ?? tiragem;
    return (item.acabamento.valorPorUnidade ?? 0) * quantidade * perda;
  }
  return item.valorAvulso ?? 0;
}

export function calcularEstaExpirado(
  status: string,
  createdAt: Date | string,
  validadeDias: number
): boolean {
  if (status === "APROVADO") return false;
  const limite = new Date(createdAt);
  limite.setDate(limite.getDate() + validadeDias);
  return limite < new Date();
}
