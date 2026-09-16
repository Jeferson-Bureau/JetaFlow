"use client";

import { useState } from "react";

export interface EtiquetaAvulsaCriada {
  id: string;
  descricao: string;
  quantidade: number;
  createdAt: string;
}

export default function EtiquetaAvulsaForm({
  onCreated,
}: {
  onCreated: (etiqueta: EtiquetaAvulsaCriada) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const response = await fetch("/api/etiquetas-avulsas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao, quantidade: Number(quantidade) }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Erro ao criar etiqueta avulsa");
      return;
    }
    onCreated(data);
    setDescricao("");
    setQuantidade("1");
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-4 rounded border p-4">
      <input
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="flex-1 rounded border px-3 py-2"
        required
      />
      <input
        type="number"
        placeholder="Quantidade"
        min={1}
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        className="w-28 rounded border px-3 py-2"
        required
      />
      {error && <p className="w-full text-sm text-rosa">{error}</p>}
      <button type="submit" className="rounded bg-ciano px-4 py-2 text-white">
        Gerar etiquetas
      </button>
    </form>
  );
}
