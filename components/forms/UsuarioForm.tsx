"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface UsuarioFormValues {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  role: "ADMIN" | "OPERADOR";
  ativo: boolean;
}

const empty: UsuarioFormValues = { nome: "", email: "", senha: "", role: "OPERADOR", ativo: true };

export default function UsuarioForm({ initial }: { initial?: UsuarioFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<UsuarioFormValues>(initial ?? empty);
  const [error, setError] = useState("");

  function set<K extends keyof UsuarioFormValues>(key: K, value: UsuarioFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { ...values, senha: values.senha || undefined };
    const url = values.id ? `/api/usuarios/${values.id}` : "/api/usuarios";
    const method = values.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Erro ao salvar usuário");
      return;
    }
    router.push("/configuracoes/usuarios");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <input placeholder="Nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <input type="email" placeholder="E-mail" value={values.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded border px-3 py-2" required />
      <input type="password" placeholder={values.id ? "Nova senha (opcional)" : "Senha"} value={values.senha} onChange={(e) => set("senha", e.target.value)} className="w-full rounded border px-3 py-2" required={!values.id} />
      <select value={values.role} onChange={(e) => set("role", e.target.value as "ADMIN" | "OPERADOR")} className="w-full rounded border px-3 py-2">
        <option value="OPERADOR">Operador</option>
        <option value="ADMIN">Administrador</option>
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.ativo} onChange={(e) => set("ativo", e.target.checked)} />
        Ativo
      </label>
      {error && <p className="text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">Salvar</button>
    </form>
  );
}
