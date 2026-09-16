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
}

export interface ItemCalculoInput {
  tipo: "DIGITAL" | "OFFSET";
  substrato: SubstratoParaCalculo;
  larguraCm: number;
  alturaCm: number;
  tiragem: number;
  equipamento: EquipamentoParaCalculo;
  chapa?: SubstratoParaCalculo | null;
  chapaQuantidade?: number | null;
  tinta?: SubstratoParaCalculo | null;
  tintaQuantidade?: number | null;
  substratoFolhas?: number | null;
  acabamentoCusto: number;
  margemLucro: number;
  parametros: ParametrosParaCalculo;
}

export interface ItemCalculoResultado {
  custoCalculado: number;
  precoFinal: number;
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

  const substratoPorFolha = input.substrato.unidadeMedida === "folha";
  if (substratoPorFolha && !(input.substratoFolhas && input.substratoFolhas > 0)) {
    throw new Error("Quantidade de folhas obrigatória para papel");
  }

  const areaM2 = (input.larguraCm / 100) * (input.alturaCm / 100);
  const custoSubstrato =
    (substratoPorFolha ? input.substratoFolhas! : areaM2 * input.tiragem) *
    input.substrato.custoUnitario *
    (1 + input.substrato.percentualPerda / 100) *
    (1 + input.substrato.markup / 100);

  const custoChapa =
    input.tipo === "OFFSET" && input.chapa && input.chapaQuantidade
      ? input.chapaQuantidade * input.chapa.custoUnitario
      : 0;

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

  const custoAcabamento = input.acabamentoCusto;

  const custoMaoObra = (tempoMinMaquina / 60) * input.parametros.custoMaoObraHoraPadrao;

  const subtotalAntesIndireto =
    custoSubstrato + custoChapa + custoTinta + custoMaquina + custoAcabamento + custoMaoObra;
  const custoIndireto =
    subtotalAntesIndireto * (input.parametros.percentualCustosIndiretosPadrao / 100);

  const custoCalculado = subtotalAntesIndireto + custoIndireto;
  const precoFinal = custoCalculado * (1 + input.margemLucro / 100);

  return { custoCalculado, precoFinal };
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
