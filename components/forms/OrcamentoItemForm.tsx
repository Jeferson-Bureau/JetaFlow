"use client";

import Combobox from "@/components/ui/Combobox";
import { calcularItem, type ItemCalculoInput } from "@/lib/services/orcamentoCalculo";

export interface OrcamentoItemValues {
  descricao: string;
  tipo: "DIGITAL" | "OFFSET";
  substratoId: string;
  larguraCm: number;
  alturaCm: number;
  tiragem: number;
  equipamentoId: string;
  chapaId: string | null;
  chapaQuantidade: number | null;
  tintaId: string | null;
  tintaQuantidade: number | null;
  acabamentoDescricao: string;
  acabamentoCusto: number;
  margemLucro: number;
}

interface SubstratoOpcao {
  id: string;
  nome: string;
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

interface OrcamentoItemFormProps {
  value: OrcamentoItemValues;
  onChange: (value: OrcamentoItemValues) => void;
  onRemove: () => void;
  substratos: SubstratoOpcao[];
  equipamentos: EquipamentoOpcao[];
  parametros: { custoMaoObraHoraPadrao: number; percentualCustosIndiretosPadrao: number };
}

function calcularPreview(
  value: OrcamentoItemValues,
  substratos: SubstratoOpcao[],
  equipamentos: EquipamentoOpcao[],
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
    chapaQuantidade: value.chapaQuantidade,
    tinta,
    tintaQuantidade: value.tintaQuantidade,
    acabamentoCusto: value.acabamentoCusto,
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
  parametros,
}: OrcamentoItemFormProps) {
  const preview = calcularPreview(value, substratos, equipamentos, parametros);

  function set<K extends keyof OrcamentoItemValues>(key: K, val: OrcamentoItemValues[K]) {
    onChange({ ...value, [key]: val });
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
              chapaQuantidade: tipo === "DIGITAL" ? null : value.chapaQuantidade,
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
          value={substratos.find((s) => s.id === value.substratoId) ?? null}
          onChange={(s) => set("substratoId", s.id)}
          getLabel={(s) => s.nome}
          placeholder="Substrato"
        />
      </div>

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
            <input
              type="number"
              placeholder="Qtd. chapas (cores)"
              value={value.chapaQuantidade ?? ""}
              onChange={(e) => set("chapaQuantidade", e.target.value === "" ? null : Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
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

      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Acabamento"
          value={value.acabamentoDescricao}
          onChange={(e) => set("acabamentoDescricao", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Custo do acabamento"
          value={value.acabamentoCusto || ""}
          onChange={(e) => set("acabamentoCusto", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          placeholder="Margem de lucro (%)"
          value={value.margemLucro || ""}
          onChange={(e) => set("margemLucro", Number(e.target.value))}
          className="rounded border px-3 py-2"
        />
      </div>

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
