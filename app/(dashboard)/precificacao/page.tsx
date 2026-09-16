"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Substrato {
  id: string;
  nome: string;
  tipo: string;
  unidadeMedida: string;
  custoUnitario?: number;
  atributos: Record<string, string | number>;
  ativo: boolean;
}
interface Equipamento { id: string; nome: string; tipo: string; formatoMaximo: string; ativo: boolean; }
interface Acabamento {
  id: string; nome: string; categoria: string; tipoCalculo: string;
  valorFixo?: number | null; valorPorUnidade?: number | null; ativo: boolean;
}

export default function PrecificacaoPage() {
  const [substratos, setSubstratos] = useState<Substrato[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [acabamentos, setAcabamentos] = useState<Acabamento[]>([]);

  useEffect(() => {
    fetch("/api/substratos").then((r) => r.json()).then(setSubstratos);
  }, []);

  useEffect(() => {
    fetch("/api/equipamentos").then((r) => r.json()).then(setEquipamentos);
  }, []);

  useEffect(() => {
    fetch("/api/acabamentos").then((r) => r.json()).then(setAcabamentos);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Precificação e Substratos</h1>
        <Link href="/precificacao/substratos/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo substrato</Link>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2">Nome</th>
            <th className="py-2">Tipo</th>
            <th className="py-2">Gramatura</th>
            <th className="py-2">Formato</th>
            <th className="py-2">Unidade</th>
            <th className="py-2">Valor</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {substratos.map((s) => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/precificacao/substratos/${s.id}`}>{s.nome}</Link></td>
              <td className="py-2">{s.tipo}</td>
              <td className="py-2">{s.atributos?.gramatura ?? "—"}</td>
              <td className="py-2">{s.atributos?.formato ?? "—"}</td>
              <td className="py-2">{s.unidadeMedida}</td>
              <td className="py-2">
                {s.custoUnitario != null ? `R$ ${s.custoUnitario.toFixed(2)} / ${s.unidadeMedida}` : "—"}
              </td>
              <td className="py-2">{s.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-marinho">Equipamentos</h2>
        <Link href="/precificacao/equipamentos/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo equipamento</Link>
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">Tipo</th><th className="py-2">Formato máximo</th><th className="py-2">Status</th></tr></thead>
        <tbody>
          {equipamentos.map((e) => (
            <tr key={e.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/precificacao/equipamentos/${e.id}`}>{e.nome}</Link></td>
              <td className="py-2">{e.tipo}</td>
              <td className="py-2">{e.formatoMaximo}</td>
              <td className="py-2">{e.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-marinho">Acabamentos</h2>
        <Link href="/precificacao/acabamentos/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo acabamento</Link>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2">Nome</th>
            <th className="py-2">Categoria</th>
            <th className="py-2">Cálculo</th>
            <th className="py-2">Valor</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {acabamentos.map((a) => (
            <tr key={a.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/precificacao/acabamentos/${a.id}`}>{a.nome}</Link></td>
              <td className="py-2">{a.categoria}</td>
              <td className="py-2">{a.tipoCalculo === "FIXO" ? "Fixo" : "Por unidade"}</td>
              <td className="py-2">
                {a.tipoCalculo === "FIXO"
                  ? (a.valorFixo != null ? `R$ ${a.valorFixo.toFixed(2)}` : "—")
                  : (a.valorPorUnidade != null ? `R$ ${a.valorPorUnidade.toFixed(2)} / un.` : "—")}
              </td>
              <td className="py-2">{a.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
