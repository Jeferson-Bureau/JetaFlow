"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FornecedorFormValues {
  id?: string;
  razaoSocial: string;
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  categoria: string;
}

const empty: FornecedorFormValues = {
  razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", cep: "",
  endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", categoria: "",
};

export default function FornecedorForm({ initial }: { initial?: FornecedorFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<FornecedorFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof FornecedorFormValues>(key: K, value: FornecedorFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleCnpjBlur() {
    if (values.cnpj.replace(/\D/g, "").length !== 14) return;
    const response = await fetch(`/api/lookup/cnpj?cnpj=${values.cnpj}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({
      ...v, razaoSocial: v.razaoSocial || data.razaoSocial, cep: data.cep, endereco: data.endereco,
      numero: data.numero, bairro: data.bairro, cidade: data.cidade, uf: data.uf,
    }));
  }

  async function handleCepBlur() {
    if (values.cep.replace(/\D/g, "").length !== 8) return;
    const response = await fetch(`/api/lookup/cep?cep=${values.cep}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({ ...v, endereco: data.endereco, bairro: data.bairro, cidade: data.cidade, uf: data.uf }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = values.id ? `/api/fornecedores/${values.id}` : "/api/fornecedores";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar fornecedor");
      return;
    }
    router.push("/fornecedores");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <input placeholder="CNPJ" value={values.cnpj} onChange={(e) => set("cnpj", e.target.value)} onBlur={handleCnpjBlur} className="w-full rounded border px-3 py-2" required />
      <input placeholder="Razão social" value={values.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="Contato" value={values.contato} onChange={(e) => set("contato", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Telefone" value={values.telefone} onChange={(e) => set("telefone", e.target.value)} className="rounded border px-3 py-2" />
      </div>
      <input placeholder="E-mail" value={values.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded border px-3 py-2" />
      <div className="grid grid-cols-3 gap-4">
        <input placeholder="CEP" value={values.cep} onChange={(e) => set("cep", e.target.value)} onBlur={handleCepBlur} className="rounded border px-3 py-2" />
        <input placeholder="Endereço" value={values.endereco} onChange={(e) => set("endereco", e.target.value)} className="col-span-2 rounded border px-3 py-2" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <input placeholder="Número" value={values.numero} onChange={(e) => set("numero", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Complemento" value={values.complemento} onChange={(e) => set("complemento", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Bairro" value={values.bairro} onChange={(e) => set("bairro", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Cidade/UF" value={`${values.cidade}${values.uf ? "/" + values.uf : ""}`} readOnly className="rounded border bg-gray-100 px-3 py-2" />
      </div>
      <input placeholder="Categoria de fornecimento (papel, tinta, chapas...)" value={values.categoria} onChange={(e) => set("categoria", e.target.value)} className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
