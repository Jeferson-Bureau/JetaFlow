"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categoriasAcabamento, tiposCalculoAcabamento } from "@/lib/validators/acabamento";

export interface AcabamentoFormValues {
  id?: string;
  nome: string;
  categoria: (typeof categoriasAcabamento)[number];
  tipoCalculo: (typeof tiposCalculoAcabamento)[number];
  valorFixo: string;
  valorPorUnidade: string;
  percentualPerda: string;
  ativo: boolean;
}

const empty: AcabamentoFormValues = {
  nome: "", categoria: "OUTRO", tipoCalculo: "FIXO",
  valorFixo: "", valorPorUnidade: "", percentualPerda: "0", ativo: true,
};

export default function AcabamentoForm({ initial }: { initial?: AcabamentoFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<AcabamentoFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof AcabamentoFormValues>(key: K, value: AcabamentoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...values,
      valorFixo: values.tipoCalculo === "FIXO" ? Number(values.valorFixo) : undefined,
      valorPorUnidade: values.tipoCalculo === "POR_UNIDADE" ? Number(values.valorPorUnidade) : undefined,
      percentualPerda: Number(values.percentualPerda),
    };
    const url = values.id ? `/api/acabamentos/${values.id}` : "/api/acabamentos";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar acabamento");
      return;
    }
    router.push("/precificacao");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <div className="grid grid-cols-2 gap-4">
        <select value={values.categoria} onChange={(e) => set("categoria", e.target.value as AcabamentoFormValues["categoria"])} className="rounded border px-3 py-2">
          {categoriasAcabamento.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={values.tipoCalculo} onChange={(e) => set("tipoCalculo", e.target.value as AcabamentoFormValues["tipoCalculo"])} className="rounded border px-3 py-2">
          {tiposCalculoAcabamento.map((t) => <option key={t} value={t}>{t === "FIXO" ? "Valor fixo por trabalho" : "Valor por unidade"}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {values.tipoCalculo === "FIXO" ? (
          <input type="number" step="0.01" placeholder="Valor fixo (R$)" value={values.valorFixo} onChange={(e) => set("valorFixo", e.target.value)} className="rounded border px-3 py-2" required />
        ) : (
          <input type="number" step="0.01" placeholder="Valor por unidade (R$)" value={values.valorPorUnidade} onChange={(e) => set("valorPorUnidade", e.target.value)} className="rounded border px-3 py-2" required />
        )}
        <input type="number" step="0.01" placeholder="Perda padrão (%)" value={values.percentualPerda} onChange={(e) => set("percentualPerda", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
