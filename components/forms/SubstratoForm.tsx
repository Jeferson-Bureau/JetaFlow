"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "@/components/ui/Combobox";
import { tiposSubstrato } from "@/lib/validators/substrato";

interface Fornecedor { id: string; razaoSocial: string; }

const camposPorTipo: Record<(typeof tiposSubstrato)[number], { key: string; label: string }[]> = {
  PAPEL: [
    { key: "gramatura", label: "Gramatura (g/m²)" },
    { key: "formato", label: "Formato da folha" },
    { key: "acabamento", label: "Acabamento superficial" },
  ],
  LONA: [
    { key: "tipoLona", label: "Tipo (frontlight/backlight/blackout)" },
    { key: "larguraBobina", label: "Largura da bobina (m)" },
    { key: "gramatura", label: "Gramatura" },
  ],
  ADESIVO: [
    { key: "tipoAdesivo", label: "Tipo (brilho/fosco/perfurado/refletivo)" },
    { key: "larguraBobina", label: "Largura da bobina (m)" },
  ],
  PVC: [
    { key: "espessura", label: "Espessura (mm)" },
    { key: "formatoChapa", label: "Formato da chapa" },
  ],
  ACRILICO: [
    { key: "espessura", label: "Espessura (mm)" },
    { key: "formatoChapa", label: "Formato da chapa" },
    { key: "corTransparencia", label: "Cor/transparência" },
  ],
  CHAPA_OFFSET: [
    { key: "formato", label: "Formato" },
    { key: "tipoCtp", label: "Tipo CTP" },
  ],
  TINTA: [
    { key: "sistema", label: "Sistema (CMYK/Pantone)" },
    { key: "rendimento", label: "Rendimento" },
    { key: "uso", label: "Uso (offset/digital/UV)" },
  ],
  VERNIZ: [
    { key: "tipoVerniz", label: "Tipo (UV total/localizado)" },
    { key: "rendimento", label: "Rendimento" },
  ],
  LAMINADO: [
    { key: "tipoLaminado", label: "Tipo (BOPP fosco/brilho/soft touch)" },
    { key: "larguraBobina", label: "Largura da bobina (m)" },
  ],
};

export interface SubstratoFormValues {
  id?: string;
  nome: string;
  tipo: (typeof tiposSubstrato)[number];
  fornecedorId: string;
  unidadeMedida: string;
  custoUnitario: string;
  percentualPerda: string;
  markup: string;
  atributos: Record<string, string>;
  ativo: boolean;
}

const empty: SubstratoFormValues = {
  nome: "", tipo: "PAPEL", fornecedorId: "", unidadeMedida: "",
  custoUnitario: "", percentualPerda: "0", markup: "0", atributos: {}, ativo: true,
};

export default function SubstratoForm({ initial }: { initial?: SubstratoFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<SubstratoFormValues>(initial ?? empty);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/fornecedores").then((r) => r.json()).then(setFornecedores);
  }, []);

  function set<K extends keyof SubstratoFormValues>(key: K, value: SubstratoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setAtributo(key: string, value: string) {
    setValues((v) => ({ ...v, atributos: { ...v.atributos, [key]: value } }));
  }

  const fornecedorSelecionado = fornecedores.find((f) => f.id === values.fornecedorId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...values,
      fornecedorId: values.fornecedorId || undefined,
      custoUnitario: Number(values.custoUnitario),
      percentualPerda: Number(values.percentualPerda),
      markup: Number(values.markup),
    };
    const url = values.id ? `/api/substratos/${values.id}` : "/api/substratos";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar substrato");
      return;
    }
    router.push("/precificacao");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <select value={values.tipo} onChange={(e) => set("tipo", e.target.value as SubstratoFormValues["tipo"])} className="w-full rounded border px-3 py-2">
        {tiposSubstrato.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
      </select>
      <Combobox
        items={fornecedores}
        value={fornecedorSelecionado}
        onChange={(f) => set("fornecedorId", f.id)}
        getLabel={(f) => f.razaoSocial}
        placeholder="Fornecedor"
      />
      <div className="grid grid-cols-3 gap-4">
        <input placeholder="Unidade de medida" value={values.unidadeMedida} onChange={(e) => set("unidadeMedida", e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" step="0.01" placeholder="Custo unitário" value={values.custoUnitario} onChange={(e) => set("custoUnitario", e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" step="0.01" placeholder="Markup (%)" value={values.markup} onChange={(e) => set("markup", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input type="number" step="0.01" placeholder="Perda padrão (%)" value={values.percentualPerda} onChange={(e) => set("percentualPerda", e.target.value)} className="w-full rounded border px-3 py-2" />

      <fieldset className="space-y-2 rounded border p-4">
        <legend className="px-1 text-sm text-gray-500">Campos específicos de {values.tipo}</legend>
        {camposPorTipo[values.tipo].map((campo) => (
          <input
            key={campo.key}
            placeholder={campo.label}
            value={values.atributos[campo.key] ?? ""}
            onChange={(e) => setAtributo(campo.key, e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
