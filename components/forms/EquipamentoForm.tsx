"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tiposEquipamento } from "@/lib/validators/equipamento";

export interface EquipamentoFormValues {
  id?: string;
  nome: string;
  tipo: (typeof tiposEquipamento)[number];
  velocidade: string;
  unidadeVelocidade: string;
  formatoMaximo: string;
  custoHora: string;
  tempoSetupMin: string;
  percentualPerda: string;
  acabamentosSuportados: string;
  ativo: boolean;
}

const empty: EquipamentoFormValues = {
  nome: "", tipo: "DIGITAL", velocidade: "", unidadeVelocidade: "", formatoMaximo: "",
  custoHora: "", tempoSetupMin: "0", percentualPerda: "0", acabamentosSuportados: "", ativo: true,
};

export default function EquipamentoForm({ initial }: { initial?: EquipamentoFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<EquipamentoFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof EquipamentoFormValues>(key: K, value: EquipamentoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...values,
      velocidade: Number(values.velocidade),
      custoHora: Number(values.custoHora),
      tempoSetupMin: Number(values.tempoSetupMin),
      percentualPerda: Number(values.percentualPerda),
      acabamentosSuportados: values.acabamentosSuportados.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const url = values.id ? `/api/equipamentos/${values.id}` : "/api/equipamentos";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar equipamento");
      return;
    }
    router.push("/precificacao");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <select value={values.tipo} onChange={(e) => set("tipo", e.target.value as EquipamentoFormValues["tipo"])} className="w-full rounded border px-3 py-2">
        {tiposEquipamento.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-4">
        <input type="number" placeholder="Velocidade" value={values.velocidade} onChange={(e) => set("velocidade", e.target.value)} className="rounded border px-3 py-2" required />
        <input placeholder="Unidade (folhas/hora, m²/hora...)" value={values.unidadeVelocidade} onChange={(e) => set("unidadeVelocidade", e.target.value)} className="rounded border px-3 py-2" required />
      </div>
      <input placeholder="Formato máximo" value={values.formatoMaximo} onChange={(e) => set("formatoMaximo", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <div className="grid grid-cols-3 gap-4">
        <input type="number" step="0.01" placeholder="Custo por hora" value={values.custoHora} onChange={(e) => set("custoHora", e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" placeholder="Setup (min)" value={values.tempoSetupMin} onChange={(e) => set("tempoSetupMin", e.target.value)} className="rounded border px-3 py-2" />
        <input type="number" step="0.01" placeholder="Perda padrão (%)" value={values.percentualPerda} onChange={(e) => set("percentualPerda", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input placeholder="Acabamentos suportados (separados por vírgula)" value={values.acabamentosSuportados} onChange={(e) => set("acabamentosSuportados", e.target.value)} className="w-full rounded border px-3 py-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
