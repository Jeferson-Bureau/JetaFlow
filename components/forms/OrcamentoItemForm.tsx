"use client";

import Combobox from "@/components/ui/Combobox";
import {
  calcularItem,
  calcularCustoAcabamento,
  calcularQuantidadeChapas,
  type ItemCalculoInput,
} from "@/lib/services/orcamentoCalculo";
import { sugerirAproveitamento, sugerirAproveitamentoDigital } from "@/lib/services/aproveitamentoPapel";

export interface OrcamentoItemAcabamentoValues {
  acabamentoId: string | null;
  descricaoAvulsa: string;
  quantidade: number | null;
  valorAvulso: number;
}

export interface OrcamentoItemValues {
  descricao: string;
  tipo: "DIGITAL" | "OFFSET";
  substratoId: string;
  larguraCm: number;
  alturaCm: number;
  tiragem: number;
  equipamentoId: string;
  chapaId: string | null;
  coresFrente: number | null;
  coresVerso: number | null;
  tintaId: string | null;
  tintaQuantidade: number | null;
  substratoFolhas: number | null;
  acabamentos: OrcamentoItemAcabamentoValues[];
  tipoMarkup: "MULTIPLICADOR" | "DIVISOR";
  margemLucro: number;
}

interface SubstratoOpcao {
  id: string;
  nome: string;
  unidadeMedida: string;
  custoUnitario: number;
  percentualPerda: number;
  markup: number;
}

interface EquipamentoOpcao {
  id: string;
  nome: string;
  velocidade: number;
  tempoSetupMin: number;
  custoHora: number;
  percentualPerda: number;
}

export interface AcabamentoOpcao {
  id: string;
  nome: string;
  tipoCalculo: "FIXO" | "POR_UNIDADE";
  valorFixo: number | null;
  valorPorUnidade: number | null;
  percentualPerda: number;
}

interface OrcamentoItemFormProps {
  value: OrcamentoItemValues;
  onChange: (value: OrcamentoItemValues) => void;
  onRemove: () => void;
  substratos: SubstratoOpcao[];
  equipamentos: EquipamentoOpcao[];
  acabamentos: AcabamentoOpcao[];
  parametros: {
    custoMaoObraHoraPadrao: number;
    percentualCustosIndiretosPadrao: number;
    impostosPercentualPadrao: number;
    comissaoPercentualPadrao: number;
    despesasFinanceirasPercentualPadrao: number;
  };
}

function acabamentoVazio(): OrcamentoItemAcabamentoValues {
  return { acabamentoId: null, descricaoAvulsa: "", quantidade: null, valorAvulso: 0 };
}

function custoTotalAcabamentos(
  itens: OrcamentoItemAcabamentoValues[],
  catalogo: AcabamentoOpcao[],
  tiragem: number
): number {
  return itens.reduce((soma, item) => {
    const acabamento = item.acabamentoId ? catalogo.find((a) => a.id === item.acabamentoId) ?? null : null;
    return (
      soma +
      calcularCustoAcabamento(
        { acabamento, quantidade: item.quantidade, valorAvulso: item.valorAvulso },
        tiragem
      )
    );
  }, 0);
}

function calcularPreview(
  value: OrcamentoItemValues,
  substratos: SubstratoOpcao[],
  equipamentos: EquipamentoOpcao[],
  acabamentos: AcabamentoOpcao[],
  parametros: OrcamentoItemFormProps["parametros"]
): { custoCalculado: number; precoFinal: number } | null {
  const substrato = substratos.find((s) => s.id === value.substratoId);
  const equipamento = equipamentos.find((e) => e.id === value.equipamentoId);
  if (!substrato || !equipamento || value.larguraCm <= 0 || value.alturaCm <= 0 || value.tiragem <= 0) {
    return null;
  }
  const chapa = value.chapaId ? substratos.find((s) => s.id === value.chapaId) ?? null : null;
  const tinta = value.tintaId ? substratos.find((s) => s.id === value.tintaId) ?? null : null;

  const input: ItemCalculoInput = {
    tipo: value.tipo,
    substrato,
    larguraCm: value.larguraCm,
    alturaCm: value.alturaCm,
    tiragem: value.tiragem,
    equipamento,
    chapa,
    coresFrente: value.coresFrente,
    coresVerso: value.coresVerso,
    tinta,
    tintaQuantidade: value.tintaQuantidade,
    substratoFolhas: value.substratoFolhas,
    acabamentoCustoTotal: custoTotalAcabamentos(value.acabamentos, acabamentos, value.tiragem),
    tipoMarkup: value.tipoMarkup,
    margemLucro: value.margemLucro,
    parametros,
  };

  try {
    return calcularItem(input);
  } catch {
    return null;
  }
}

export default function OrcamentoItemForm({
  value,
  onChange,
  onRemove,
  substratos,
  equipamentos,
  acabamentos,
  parametros,
}: OrcamentoItemFormProps) {
  const preview = calcularPreview(value, substratos, equipamentos, acabamentos, parametros);
  const substratoSelecionado = substratos.find((s) => s.id === value.substratoId);
  const substratoPorFolha = substratoSelecionado?.unidadeMedida === "folha";
  const sugestoesAproveitamento =
    substratoPorFolha && value.larguraCm > 0 && value.alturaCm > 0 && value.tiragem > 0
      ? value.tipo === "OFFSET"
        ? sugerirAproveitamento(value.larguraCm, value.alturaCm, value.tiragem)
        : sugerirAproveitamentoDigital(value.larguraCm, value.alturaCm, value.tiragem)
      : [];
  const melhorAproveitamento = sugestoesAproveitamento[0] ?? null;

  function set<K extends keyof OrcamentoItemValues>(key: K, val: OrcamentoItemValues[K]) {
    onChange({ ...value, [key]: val });
  }

  function adicionarAcabamento() {
    set("acabamentos", [...value.acabamentos, acabamentoVazio()]);
  }

  function atualizarAcabamento(index: number, val: OrcamentoItemAcabamentoValues) {
    set(
      "acabamentos",
      value.acabamentos.map((a, i) => (i === index ? val : a))
    );
  }

  function removerAcabamento(index: number) {
    set(
      "acabamentos",
      value.acabamentos.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Descrição"
          value={value.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="button" onClick={onRemove} className="ml-3 text-sm text-rosa">
          Remover
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={value.tipo}
          onChange={(e) => {
            const tipo = e.target.value as "DIGITAL" | "OFFSET";
            onChange({
              ...value,
              tipo,
              chapaId: tipo === "DIGITAL" ? null : value.chapaId,
              coresFrente: tipo === "DIGITAL" ? null : value.coresFrente,
              coresVerso: tipo === "DIGITAL" ? null : value.coresVerso,
              tintaId: tipo === "DIGITAL" ? null : value.tintaId,
              tintaQuantidade: tipo === "DIGITAL" ? null : value.tintaQuantidade,
            });
          }}
          className="rounded border px-3 py-2"
        >
          <option value="DIGITAL">Digital</option>
          <option value="OFFSET">Offset</option>
        </select>

        <Combobox
          items={substratos}
          value={substratoSelecionado ?? null}
          onChange={(s) => set("substratoId", s.id)}
          getLabel={(s) => s.nome}
          placeholder="Substrato"
        />
      </div>

      {substratoPorFolha && (
        <div className="space-y-1">
          <input
            type="number"
            placeholder={
              melhorAproveitamento
                ? `Quantidade de folhas (auto: ${melhorAproveitamento.folhasNecessarias})`
                : "Quantidade de folhas"
            }
            value={value.substratoFolhas ?? ""}
            onChange={(e) => set("substratoFolhas", e.target.value === "" ? null : Number(e.target.value))}
            className="w-full rounded border px-3 py-2"
          />
          <p className="text-xs text-gray-400">
            Deixe em branco para calcular automaticamente pelo melhor aproveitamento de papel.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          placeholder="Largura (cm)"
          value={value.larguraCm || ""}
          onChange={(e) => set("larguraCm", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Altura (cm)"
          value={value.alturaCm || ""}
          onChange={(e) => set("alturaCm", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Tiragem"
          value={value.tiragem || ""}
          onChange={(e) => set("tiragem", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
      </div>

      <Combobox
        items={equipamentos}
        value={equipamentos.find((e) => e.id === value.equipamentoId) ?? null}
        onChange={(e) => set("equipamentoId", e.id)}
        getLabel={(e) => e.nome}
        placeholder="Equipamento"
      />

      {value.tipo === "OFFSET" && (
        <div className="grid grid-cols-2 gap-3 rounded border border-dashed p-3">
          <div className="space-y-2">
            <Combobox
              items={substratos}
              value={substratos.find((s) => s.id === value.chapaId) ?? null}
              onChange={(s) => set("chapaId", s.id)}
              getLabel={(s) => s.nome}
              placeholder="Chapa"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Cores frente"
                value={value.coresFrente ?? ""}
                onChange={(e) => set("coresFrente", e.target.value === "" ? null : Number(e.target.value))}
                className="rounded border px-3 py-2"
              />
              <input
                type="number"
                placeholder="Cores verso"
                value={value.coresVerso ?? ""}
                onChange={(e) => set("coresVerso", e.target.value === "" ? null : Number(e.target.value))}
                className="rounded border px-3 py-2"
              />
            </div>
            {value.chapaId && (
              <p className="text-sm text-gray-500">
                Chapas calculadas: {calcularQuantidadeChapas(value.coresFrente, value.coresVerso)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Combobox
              items={substratos}
              value={substratos.find((s) => s.id === value.tintaId) ?? null}
              onChange={(s) => set("tintaId", s.id)}
              getLabel={(s) => s.nome}
              placeholder="Tinta"
            />
            <input
              type="number"
              placeholder="Qtd. tinta"
              value={value.tintaQuantidade ?? ""}
              onChange={(e) => set("tintaQuantidade", e.target.value === "" ? null : Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      )}

      {sugestoesAproveitamento.length > 0 && (
        <div className="rounded border border-dashed border-ciano p-3 text-sm">
          <p className="mb-1 font-medium text-marinho">Melhor aproveitamento de papel</p>
          <ul className="space-y-1 text-gray-600">
            {sugestoesAproveitamento.slice(0, 3).map((sugestao, i) => (
              <li key={i}>
                Folha {sugestao.formatoPai.larguraCm}×{sugestao.formatoPai.alturaCm} cm → corte{" "}
                {sugestao.corte.larguraCm}×{sugestao.corte.alturaCm} cm → {sugestao.corte.pecas}{" "}
                peças/folha → ~{sugestao.folhasNecessarias} folhas para a tiragem
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 rounded border border-dashed p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-marinho">Acabamentos</p>
          <button type="button" onClick={adicionarAcabamento} className="text-sm text-ciano">
            + Adicionar acabamento
          </button>
        </div>
        {value.acabamentos.map((acabamentoItem, index) => {
          const catalogo = acabamentoItem.acabamentoId
            ? acabamentos.find((a) => a.id === acabamentoItem.acabamentoId) ?? null
            : null;
          const custoLinha = calcularCustoAcabamento(
            { acabamento: catalogo, quantidade: acabamentoItem.quantidade, valorAvulso: acabamentoItem.valorAvulso },
            value.tiragem
          );
          return (
            <div key={index} className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={acabamentoItem.acabamentoId ?? "AVULSO"}
                  onChange={(e) => {
                    const id = e.target.value === "AVULSO" ? null : e.target.value;
                    atualizarAcabamento(index, {
                      acabamentoId: id,
                      descricaoAvulsa: id ? "" : acabamentoItem.descricaoAvulsa,
                      quantidade: null,
                      valorAvulso: 0,
                    });
                  }}
                  className="rounded border px-3 py-2"
                >
                  <option value="AVULSO">Avulso (descrição + valor manual)</option>
                  {acabamentos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>

                {catalogo ? (
                  catalogo.tipoCalculo === "POR_UNIDADE" ? (
                    <input
                      type="number"
                      placeholder={`Quantidade (padrão: tiragem = ${value.tiragem})`}
                      value={acabamentoItem.quantidade ?? ""}
                      onChange={(e) =>
                        atualizarAcabamento(index, {
                          ...acabamentoItem,
                          quantidade: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className="rounded border px-3 py-2"
                    />
                  ) : (
                    <span className="flex items-center text-sm text-gray-500">
                      Custo: R$ {custoLinha.toFixed(2)}
                    </span>
                  )
                ) : (
                  <input
                    type="text"
                    placeholder="Descrição do acabamento"
                    value={acabamentoItem.descricaoAvulsa}
                    onChange={(e) =>
                      atualizarAcabamento(index, { ...acabamentoItem, descricaoAvulsa: e.target.value })
                    }
                    className="rounded border px-3 py-2"
                  />
                )}

                {!catalogo && (
                  <input
                    type="number"
                    placeholder="Valor (R$)"
                    value={acabamentoItem.valorAvulso || ""}
                    onChange={(e) =>
                      atualizarAcabamento(index, { ...acabamentoItem, valorAvulso: Number(e.target.value) })
                    }
                    className="rounded border px-3 py-2"
                  />
                )}

                {catalogo && catalogo.tipoCalculo === "POR_UNIDADE" && (
                  <span className="flex items-center text-sm text-gray-500">
                    Custo: R$ {custoLinha.toFixed(2)}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => removerAcabamento(index)} className="text-sm text-rosa">
                Remover
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={value.tipoMarkup}
          onChange={(e) => set("tipoMarkup", e.target.value as "MULTIPLICADOR" | "DIVISOR")}
          className="rounded border px-3 py-2"
        >
          <option value="MULTIPLICADOR">Markup multiplicador (custo × margem)</option>
          <option value="DIVISOR">Markup divisor (impostos + comissão + despesas + lucro)</option>
        </select>
        <input
          type="number"
          placeholder={value.tipoMarkup === "DIVISOR" ? "Lucro desejado (%)" : "Margem de lucro (%)"}
          value={value.margemLucro || ""}
          onChange={(e) => set("margemLucro", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
      </div>

      {value.tipoMarkup === "DIVISOR" && (
        <p className="text-xs text-gray-400">
          Markup divisor = 1 − impostos ({parametros.impostosPercentualPadrao}%) − comissão (
          {parametros.comissaoPercentualPadrao}%) − despesas financeiras (
          {parametros.despesasFinanceirasPercentualPadrao}%) − lucro desejado ({value.margemLucro || 0}%)
        </p>
      )}

      <div className="text-right text-sm">
        {preview ? (
          <>
            <span className="text-gray-500">Custo: R$ {preview.custoCalculado.toFixed(2)} — </span>
            <span className="font-semibold text-ciano">Preço: R$ {preview.precoFinal.toFixed(2)}</span>
          </>
        ) : (
          <span className="text-gray-400">Preencha os campos para ver o cálculo</span>
        )}
      </div>
    </div>
  );
}
