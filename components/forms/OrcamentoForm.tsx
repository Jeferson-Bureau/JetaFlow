"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Combobox from "@/components/ui/Combobox";
import OrcamentoItemForm, { type OrcamentoItemValues } from "@/components/forms/OrcamentoItemForm";

interface Cliente {
  id: string;
  nome: string;
}

interface SubstratoOpcao {
  id: string;
  nome: string;
  tipo: string;
  unidadeMedida: string;
  custoUnitario: number;
  percentualPerda: number;
  markup: number;
}

interface EquipamentoOpcao {
  id: string;
  nome: string;
  velocidade: number;
  tempoSetupMin: number;
  custoHora: number;
  percentualPerda: number;
}

interface Parametros {
  margemLucroPadrao: number;
  custoMaoObraHoraPadrao: number;
  percentualCustosIndiretosPadrao: number;
}

function itemVazio(margemPadrao: number): OrcamentoItemValues {
  return {
    descricao: "",
    tipo: "DIGITAL",
    substratoId: "",
    larguraCm: 0,
    alturaCm: 0,
    tiragem: 0,
    equipamentoId: "",
    chapaId: null,
    chapaQuantidade: null,
    tintaId: null,
    tintaQuantidade: null,
    substratoFolhas: null,
    acabamentoDescricao: "",
    acabamentoCusto: 0,
    margemLucro: margemPadrao,
  };
}

export interface OrcamentoFormInitial {
  id?: string;
  clienteId: string;
  observacoes: string;
  itens: OrcamentoItemValues[];
}

export default function OrcamentoForm({ initial }: { initial?: OrcamentoFormInitial }) {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [substratos, setSubstratos] = useState<SubstratoOpcao[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoOpcao[]>([]);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [erro, setErro] = useState("");

  const [clienteId, setClienteId] = useState(initial?.clienteId ?? "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [itens, setItens] = useState<OrcamentoItemValues[]>(initial?.itens ?? []);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/catalogo-precificacao/substratos").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/catalogo-precificacao/equipamentos").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/parametros-calculo").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([clientesData, substratosData, equipamentosData, parametrosData]) => {
        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setSubstratos(Array.isArray(substratosData) ? substratosData : []);
        setEquipamentos(Array.isArray(equipamentosData) ? equipamentosData : []);
        setParametros(parametrosData ?? null);
        if (!initial && itens.length === 0 && parametrosData) {
          setItens([itemVazio(parametrosData.margemLucroPadrao)]);
        }
      })
      .catch(() => setErro("Erro ao carregar dados de apoio"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function adicionarItem() {
    setItens((atual) => [...atual, itemVazio(parametros?.margemLucroPadrao ?? 0)]);
  }

  function atualizarItem(index: number, valor: OrcamentoItemValues) {
    setItens((atual) => atual.map((it, i) => (i === index ? valor : it)));
  }

  function removerItem(index: number) {
    setItens((atual) => atual.filter((_, i) => i !== index));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const payload = {
      clienteId,
      observacoes: observacoes || null,
      itens: itens.map((item) => ({
        ...item,
        acabamentoDescricao: item.acabamentoDescricao || null,
      })),
    };

    const url = initial?.id ? `/api/orcamentos/${initial.id}` : "/api/orcamentos";
    const method = initial?.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErro(data.details?.[0]?.message ?? data.error ?? "Erro ao salvar orçamento");
      return;
    }

    router.push("/orcamentos");
  }

  if (!parametros) {
    return <p className="text-sm text-gray-500">{erro || "Carregando..."}</p>;
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      {erro && <p className="text-sm text-rosa">{erro}</p>}

      <Combobox
        items={clientes}
        value={clientes.find((c) => c.id === clienteId) ?? null}
        onChange={(c) => setClienteId(c.id)}
        getLabel={(c) => c.nome}
        placeholder="Cliente"
      />

      <textarea
        placeholder="Observações"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />

      <div className="space-y-4">
        {itens.map((item, index) => (
          <OrcamentoItemForm
            key={index}
            value={item}
            onChange={(v) => atualizarItem(index, v)}
            onRemove={() => removerItem(index)}
            substratos={substratos}
            equipamentos={equipamentos}
            parametros={parametros}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={adicionarItem}
        className="rounded border border-ciano px-4 py-2 text-sm text-ciano"
      >
        + Adicionar item
      </button>

      <div className="flex justify-end">
        <button type="submit" className="rounded bg-ciano px-6 py-2 text-white">
          Salvar orçamento
        </button>
      </div>
    </form>
  );
}
