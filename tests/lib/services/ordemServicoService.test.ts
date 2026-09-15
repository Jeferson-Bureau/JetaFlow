import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  converterEmOS,
  listarOrdensServico,
  buscarOrdemServico,
  avancarEstagio,
  voltarEstagio,
  atualizarOrdemServico,
} from "@/lib/services/ordemServicoService";

async function seedOrcamentoAprovado(overrides: { status?: string } = {}) {
  await prisma.numeracaoDocumento.upsert({
    where: { tipoDocumento: "OS" },
    update: { prefixo: "OS", proximoNumero: 1, digitos: 4 },
    create: { tipoDocumento: "OS", prefixo: "OS", proximoNumero: 1, digitos: 4 },
  });
  const cliente = await prisma.cliente.create({
    data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
  });
  return prisma.orcamento.create({
    data: {
      numero: `ORC${Math.random().toString().slice(2, 8)}`,
      clienteId: cliente.id,
      validadeDias: 15,
      status: overrides.status ?? "APROVADO",
    },
  });
}

describe("ordemServicoService", () => {
  it("converts an APROVADO orcamento into an OS", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);

    expect(os.numero).toBe("OS0001");
    expect(os.estagio).toBe("ARQUIVO_RECEBIDO");
    expect(os.orcamento.id).toBe(orcamento.id);
  });

  it("rejects converting a non-APROVADO orcamento", async () => {
    const orcamento = await seedOrcamentoAprovado({ status: "RASCUNHO" });
    await expect(converterEmOS(orcamento.id)).rejects.toThrow(
      "Só é possível converter um orçamento aprovado em OS"
    );
  });

  it("rejects converting the same orcamento twice", async () => {
    const orcamento = await seedOrcamentoAprovado();
    await converterEmOS(orcamento.id);
    await expect(converterEmOS(orcamento.id)).rejects.toThrow(
      "Este orçamento já foi convertido em OS"
    );
  });

  it("lists and searches by cliente nome", async () => {
    const orcamento = await seedOrcamentoAprovado();
    await converterEmOS(orcamento.id);

    const resultados = await listarOrdensServico("Cliente Teste");
    expect(resultados).toHaveLength(1);
    const vazio = await listarOrdensServico("Nome Que Não Existe");
    expect(vazio).toHaveLength(0);
  });

  it("throws NotFoundError for a missing ordem de servico", async () => {
    await expect(buscarOrdemServico("id-inexistente")).rejects.toThrow("Não encontrado");
  });

  it("advances an OS through the full 8-stage sequence", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);

    const sequenciaEsperada = [
      "PRE_IMPRESSAO", "PRODUCAO", "ACABAMENTO", "CONFERENCIA",
      "EMBALAGEM", "EXPEDICAO", "CONCLUIDO",
    ];

    let atual = os;
    for (const esperado of sequenciaEsperada) {
      atual = await avancarEstagio(atual.id);
      expect(atual.estagio).toBe(esperado);
    }
  });

  it("rejects advancing past CONCLUIDO", async () => {
    const orcamento = await seedOrcamentoAprovado();
    let os = await converterEmOS(orcamento.id);
    for (let i = 0; i < 7; i++) {
      os = await avancarEstagio(os.id);
    }
    expect(os.estagio).toBe("CONCLUIDO");
    await expect(avancarEstagio(os.id)).rejects.toThrow(
      "Ordem de serviço já está no último estágio"
    );
  });

  it("reverts an OS to the previous stage", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);
    const avancada = await avancarEstagio(os.id);
    expect(avancada.estagio).toBe("PRE_IMPRESSAO");

    const revertida = await voltarEstagio(avancada.id);
    expect(revertida.estagio).toBe("ARQUIVO_RECEBIDO");
  });

  it("rejects reverting past ARQUIVO_RECEBIDO", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);
    await expect(voltarEstagio(os.id)).rejects.toThrow(
      "Ordem de serviço já está no primeiro estágio"
    );
  });

  it("updates prazoEntrega and observacoes without touching estagio", async () => {
    const orcamento = await seedOrcamentoAprovado();
    const os = await converterEmOS(orcamento.id);

    const atualizada = await atualizarOrdemServico(os.id, {
      prazoEntrega: "2026-12-25",
      observacoes: "Entregar antes do meio-dia",
    });

    expect(atualizada.observacoes).toBe("Entregar antes do meio-dia");
    expect(atualizada.prazoEntrega?.toISOString().slice(0, 10)).toBe("2026-12-25");
    expect(atualizada.estagio).toBe("ARQUIVO_RECEBIDO");
  });
});
