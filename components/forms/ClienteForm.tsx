"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ClienteFormValues {
  id?: string;
  tipo: "PF" | "PJ";
  nome: string;
  nomeFantasia: string;
  documento: string;
  ie: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  prazoPagamento: string;
  observacoes: string;
}

const empty: ClienteFormValues = {
  tipo: "PJ", nome: "", nomeFantasia: "", documento: "", ie: "", telefone: "", email: "",
  cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  prazoPagamento: "", observacoes: "",
};

export default function ClienteForm({ initial }: { initial?: ClienteFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<ClienteFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleCnpjBlur() {
    if (values.tipo !== "PJ" || values.documento.replace(/\D/g, "").length !== 14) return;
    const response = await fetch(`/api/lookup/cnpj?cnpj=${values.documento}`);
    if (!response.ok) return;
    const data = await response.json();
    setValues((v) => ({
      ...v, nome: v.nome || data.razaoSocial, nomeFantasia: v.nomeFantasia || data.nomeFantasia || "",
      cep: data.cep, endereco: data.endereco,
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
    const payload = { ...values, prazoPagamento: values.prazoPagamento ? Number(values.prazoPagamento) : undefined };
    const url = values.id ? `/api/clientes/${values.id}` : "/api/clientes";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar cliente");
      return;
    }
    router.push("/clientes");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <select value={values.tipo} onChange={(e) => set("tipo", e.target.value as "PF" | "PJ")} className="rounded border px-3 py-2">
          <option value="PJ">Pessoa Jurídica</option>
          <option value="PF">Pessoa Física</option>
        </select>
        <input
          placeholder={values.tipo === "PJ" ? "CNPJ" : "CPF"}
          value={values.documento}
          onChange={(e) => set("documento", e.target.value)}
          onBlur={handleCnpjBlur}
          className="rounded border px-3 py-2"
          required
        />
      </div>
      <input placeholder="Nome / Razão Social" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <input placeholder="Nome Fantasia" value={values.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} className="w-full rounded border px-3 py-2" />
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="IE" value={values.ie} onChange={(e) => set("ie", e.target.value)} className="rounded border px-3 py-2" />
        <input placeholder="Telefone/WhatsApp" value={values.telefone} onChange={(e) => set("telefone", e.target.value)} className="rounded border px-3 py-2" />
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
      <input placeholder="Prazo de pagamento (dias)" type="number" value={values.prazoPagamento} onChange={(e) => set("prazoPagamento", e.target.value)} className="w-full rounded border px-3 py-2" />
      <textarea placeholder="Observações" value={values.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
