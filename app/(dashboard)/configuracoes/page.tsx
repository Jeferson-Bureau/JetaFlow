"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Empresa {
  razaoSocial: string; cnpj: string; ie: string; endereco: string;
  telefone: string; whatsappNumero: string; temaPadrao: string; logoUrl: string | null;
}
interface Numeracao { tipoDocumento: string; prefixo: string; proximoNumero: number; digitos: number; }
interface Parametros { margemLucroPadrao: number; custoMaoObraHoraPadrao: number; percentualCustosIndiretosPadrao: number; }

type Tab = "empresa" | "numeracao" | "parametros";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("empresa");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [numeracoes, setNumeracoes] = useState<Numeracao[]>([]);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/configuracoes/empresa").then((r) => r.json()).then(setEmpresa);
    fetch("/api/configuracoes/numeracao").then((r) => r.json()).then(setNumeracoes);
    fetch("/api/configuracoes/parametros").then((r) => r.json()).then(setParametros);
  }, []);

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    const response = await fetch("/api/configuracoes/empresa", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(empresa),
    });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  async function enviarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    const response = await fetch("/api/configuracoes/empresa/logo", { method: "POST", body: formData });
    if (response.ok) {
      const data = await response.json();
      setEmpresa((prev) => (prev ? { ...prev, logoUrl: data.logoUrl } : prev));
    }
  }

  async function salvarNumeracao(n: Numeracao) {
    const response = await fetch(`/api/configuracoes/numeracao/${n.tipoDocumento}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixo: n.prefixo, proximoNumero: n.proximoNumero, digitos: n.digitos }),
    });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  async function salvarParametros(e: React.FormEvent) {
    e.preventDefault();
    if (!parametros) return;
    const response = await fetch("/api/configuracoes/parametros", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parametros),
    });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Configurações</h1>
      <div className="mb-4 flex gap-4 border-b">
        {(["empresa", "numeracao", "parametros"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 ${tab === t ? "border-b-2 border-ciano font-semibold" : ""}`}>
            {t === "empresa" ? "Empresa" : t === "numeracao" ? "Numeração" : "Parâmetros"}
          </button>
        ))}
        <Link href="/configuracoes/usuarios" className="pb-2 text-sm text-gray-500">Usuários →</Link>
      </div>

      {tab === "empresa" && empresa && (
        <form onSubmit={salvarEmpresa} className="max-w-xl space-y-4">
          <input placeholder="Razão social" value={empresa.razaoSocial} onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="CNPJ" value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="IE" value={empresa.ie} onChange={(e) => setEmpresa({ ...empresa, ie: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="Endereço" value={empresa.endereco} onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="Telefone" value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} className="w-full rounded border px-3 py-2" />
          <input placeholder="WhatsApp" value={empresa.whatsappNumero} onChange={(e) => setEmpresa({ ...empresa, whatsappNumero: e.target.value })} className="w-full rounded border px-3 py-2" />
          <select value={empresa.temaPadrao} onChange={(e) => setEmpresa({ ...empresa, temaPadrao: e.target.value })} className="w-full rounded border px-3 py-2">
            <option value="AUTOMATICO">Automático</option>
            <option value="CLARO">Claro</option>
            <option value="ESCURO">Escuro</option>
          </select>
          <div>
            <label className="block text-sm">Logotipo</label>
            <input type="file" accept="image/*" onChange={enviarLogo} />
            {empresa.logoUrl && <img src={empresa.logoUrl} alt="Logotipo" className="mt-2 h-16" />}
          </div>
          <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
        </form>
      )}

      {tab === "numeracao" && (
        <div className="max-w-xl space-y-4">
          {numeracoes.map((n, i) => (
            <div key={n.tipoDocumento} className="flex items-end gap-2 border-b pb-2">
              <span className="w-24 text-sm text-gray-500">{n.tipoDocumento}</span>
              <input placeholder="Prefixo" value={n.prefixo} onChange={(e) => {
                const next = [...numeracoes]; next[i] = { ...n, prefixo: e.target.value }; setNumeracoes(next);
              }} className="rounded border px-3 py-2" />
              <input type="number" placeholder="Próximo número" value={n.proximoNumero} onChange={(e) => {
                const next = [...numeracoes]; next[i] = { ...n, proximoNumero: Number(e.target.value) }; setNumeracoes(next);
              }} className="rounded border px-3 py-2" />
              <button onClick={() => salvarNumeracao(n)} className="rounded bg-ciano px-3 py-2 text-white">Salvar</button>
            </div>
          ))}
        </div>
      )}

      {tab === "parametros" && parametros && (
        <form onSubmit={salvarParametros} className="max-w-xl space-y-4">
          <input type="number" placeholder="Margem de lucro padrão (%)" value={parametros.margemLucroPadrao} onChange={(e) => setParametros({ ...parametros, margemLucroPadrao: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
          <input type="number" placeholder="Custo de mão de obra/hora padrão" value={parametros.custoMaoObraHoraPadrao} onChange={(e) => setParametros({ ...parametros, custoMaoObraHoraPadrao: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
          <input type="number" placeholder="Custos indiretos padrão (%)" value={parametros.percentualCustosIndiretosPadrao} onChange={(e) => setParametros({ ...parametros, percentualCustosIndiretosPadrao: Number(e.target.value) })} className="w-full rounded border px-3 py-2" />
          <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
        </form>
      )}

      {status && <p className="mt-4 text-sm text-ciano">{status}</p>}
    </div>
  );
}
