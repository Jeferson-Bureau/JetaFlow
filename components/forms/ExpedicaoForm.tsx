// components/forms/ExpedicaoForm.tsx
"use client";

export interface ExpedicaoFormValues {
  totalVolumes: number;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface ExpedicaoFormProps {
  value: ExpedicaoFormValues;
  onChange: (value: ExpedicaoFormValues) => void;
}

export default function ExpedicaoForm({ value, onChange }: ExpedicaoFormProps) {
  function set<K extends keyof ExpedicaoFormValues>(key: K, val: ExpedicaoFormValues[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-3">
      <input
        type="number"
        placeholder="Quantidade de volumes"
        value={value.totalVolumes || ""}
        onChange={(e) => set("totalVolumes", Number(e.target.value))}
        className="w-full rounded border px-3 py-2"
        min={1}
      />
      <div className="grid grid-cols-2 gap-3">
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
          className="rounded border px-3 py-2"
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
