// components/forms/ExpedicaoForm.tsx
"use client";

import { calcularDivergenciasPorItem } from "@/lib/services/expedicaoCalculo";

export interface VolumeFormValue {
  orcamentoItemId: string;
  quantidade: number;
}

export interface ExpedicaoFormValues {
  volumes: VolumeFormValue[];
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface ItemDoOrcamento {
  id: string;
  descricao: string;
  tiragem: number;
}

interface ExpedicaoFormProps {
  value: ExpedicaoFormValues;
  onChange: (value: ExpedicaoFormValues) => void;
  itens: ItemDoOrcamento[];
}

export default function ExpedicaoForm({ value, onChange, itens }: ExpedicaoFormProps) {
  function set<K extends keyof ExpedicaoFormValues>(key: K, val: ExpedicaoFormValues[K]) {
    onChange({ ...value, [key]: val });
  }

  function setVolume(index: number, patch: Partial<VolumeFormValue>) {
    const volumes = value.volumes.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChange({ ...value, volumes });
  }

  function adicionarVolume() {
    const orcamentoItemId = itens[0]?.id ?? "";
    onChange({ ...value, volumes: [...value.volumes, { orcamentoItemId, quantidade: 1 }] });
  }

  function removerVolume(index: number) {
    onChange({ ...value, volumes: value.volumes.filter((_, i) => i !== index) });
  }

  const divergencias = calcularDivergenciasPorItem(itens, value.volumes);

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded border p-3">
        <p className="text-sm font-medium text-marinho">Volumes</p>
        {value.volumes.map((volume, index) => (
          <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-2">
            <select
              value={volume.orcamentoItemId}
              onChange={(e) => setVolume(index, { orcamentoItemId: e.target.value })}
              className="rounded border px-3 py-2"
            >
              {itens.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.descricao}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Quantidade"
              value={volume.quantidade || ""}
              onChange={(e) => setVolume(index, { quantidade: Number(e.target.value) })}
              className="w-28 rounded border px-3 py-2"
              min={1}
            />
            <button
              type="button"
              onClick={() => removerVolume(index)}
              disabled={value.volumes.length <= 1}
              className="rounded border px-3 py-2 text-sm text-rosa disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={adicionarVolume}
          className="rounded border px-3 py-2 text-sm text-ciano"
        >
          + Adicionar volume
        </button>

        <div className="space-y-1 pt-2 text-sm">
          {divergencias.map((d) => (
            <p key={d.orcamentoItemId} className={d.divergente ? "text-rosa" : "text-gray-500"}>
              {d.descricao}: {d.somaVolumes} de {d.tiragem}
              {d.divergente ? " — soma não confere com a tiragem" : ""}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="CEP"
          value={value.cep}
          onChange={(e) => set("cep", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Endereço"
          value={value.endereco}
          onChange={(e) => set("endereco", e.target.value)}
          className="col-span-2 rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Número"
          value={value.numero}
          onChange={(e) => set("numero", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Complemento"
          value={value.complemento}
          onChange={(e) => set("complemento", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Bairro"
          value={value.bairro}
          onChange={(e) => set("bairro", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="Cidade"
          value={value.cidade}
          onChange={(e) => set("cidade", e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="text"
          placeholder="UF"
          value={value.uf}
          onChange={(e) => set("uf", e.target.value)}
          className="rounded border px-3 py-2"
          maxLength={2}
        />
      </div>
    </div>
  );
}
