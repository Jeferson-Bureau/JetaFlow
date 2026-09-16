import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as pncp from "@/lib/external/pncp";
import {
  cadastrarLicitacao, listarLicitacoes, buscarLicitacao,
  atualizarDadosPNCP, atualizarDadosInternos, excluirLicitacao,
} from "@/lib/services/licitacaoService";
import type { LicitacaoInternoInput } from "@/lib/validators/licitacao";

vi.mock("@/lib/external/pncp", async () => {
  const actual = await vi.importActual<typeof import("@/lib/external/pncp")>("@/lib/external/pncp");
  return { ...actual, buscarContratacaoPNCP: vi.fn() };
});

const DADOS_PNCP_MOCK = {
  orgaoNome: "MUNICIPIO DE BELA VISTA DO CAROBA",
  unidadeNome: "Prefeitura Municipal de Bela Vista da Caroba",
  numeroCompra: "PR53",
  objetoCompra: "Contratação de licença de uso de software",
  modalidadeNome: "Pregão - Eletrônico",
  situacaoCompraNome: "Divulgada no PNCP",
  valorTotalEstimado: 46150,
  valorTotalHomologado: null,
  dataAberturaProposta: "2026-08-25T08:00:01",
  dataEncerramentoProposta: "2026-09-10T08:00:01",
};

beforeEach(() => {
  vi.mocked(pncp.buscarContratacaoPNCP).mockReset();
});

describe("cadastrarLicitacao", () => {
  it("creates a Licitacao from a valid Número de Controle PNCP", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);

    const licitacao = await cadastrarLicitacao("01612441000107-1-000131/2026");

    expect(licitacao.numeroControlePNCP).toBe("01612441000107-1-000131/2026");
    expect(licitacao.cnpjOrgao).toBe("01612441000107");
    expect(licitacao.anoCompra).toBe(2026);
    expect(licitacao.sequencialCompra).toBe(131);
    expect(licitacao.orgaoNome).toBe("MUNICIPIO DE BELA VISTA DO CAROBA");
    expect(licitacao.statusInterno).toBe("ANALISANDO");
    expect(pncp.buscarContratacaoPNCP).toHaveBeenCalledWith("01612441000107", 2026, 131);
  });

  it("rejects an invalid Número de Controle PNCP format", async () => {
    await expect(cadastrarLicitacao("formato-invalido")).rejects.toThrow(
      "Número de Controle PNCP em formato inválido"
    );
    expect(pncp.buscarContratacaoPNCP).not.toHaveBeenCalled();
  });

  it("rejects a duplicate numeroControlePNCP without calling the PNCP API", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    await cadastrarLicitacao("01612441000107-1-000131/2026");
    vi.mocked(pncp.buscarContratacaoPNCP).mockClear();

    await expect(cadastrarLicitacao("01612441000107-1-000131/2026")).rejects.toThrow(
      "Esta licitação já está cadastrada"
    );
    expect(pncp.buscarContratacaoPNCP).not.toHaveBeenCalled();
  });

  it("rejects when the PNCP API returns null (not found)", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(null);
    await expect(cadastrarLicitacao("01612441000107-1-000131/2026")).rejects.toThrow(
      "Licitação não encontrada no PNCP"
    );
  });

  it("normalizes whitespace so a padded numeroControlePNCP is treated as a duplicate", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    await cadastrarLicitacao("01612441000107-1-000131/2026");

    await expect(
      cadastrarLicitacao("  01612441000107-1-000131/2026  ")
    ).rejects.toThrow("Esta licitação já está cadastrada");

    const todas = await listarLicitacoes();
    expect(todas).toHaveLength(1);
  });
});

describe("listarLicitacoes", () => {
  it("lists and searches by objetoCompra/orgaoNome/numeroCompra", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    await cadastrarLicitacao("01612441000107-1-000131/2026");

    const resultados = await listarLicitacoes("Bela Vista");
    expect(resultados).toHaveLength(1);
    const vazio = await listarLicitacoes("Nao Existe Nenhuma Palavra Dessas");
    expect(vazio).toHaveLength(0);
  });
});

describe("buscarLicitacao", () => {
  it("throws NotFoundError for a missing licitacao", async () => {
    await expect(buscarLicitacao("id-inexistente")).rejects.toThrow("Não encontrado");
  });
});

describe("atualizarDadosPNCP", () => {
  it("refreshes the snapshot fields without touching internal fields", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue({
      ...DADOS_PNCP_MOCK,
      situacaoCompraNome: "Encerrada",
      valorTotalHomologado: 44000,
    });

    const atualizada = await atualizarDadosPNCP(criada.id);

    expect(atualizada.situacaoCompraNome).toBe("Encerrada");
    expect(atualizada.valorTotalHomologado).toBe(44000);
    expect(atualizada.statusInterno).toBe("ANALISANDO");
    expect(pncp.buscarContratacaoPNCP).toHaveBeenLastCalledWith("01612441000107", 2026, 131);
  });

  it("throws NotFoundError when the PNCP API no longer has the record", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(null);
    await expect(atualizarDadosPNCP(criada.id)).rejects.toThrow("Licitação não encontrada no PNCP");
  });
});

describe("atualizarDadosInternos", () => {
  it("updates only the internal fields, leaving the PNCP snapshot untouched", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    const input: LicitacaoInternoInput = {
      statusInterno: "VAMOS_PARTICIPAR",
      valorProposta: 45000,
      responsavel: "Maria",
      observacoes: "Cliente prioritário",
    };
    const atualizada = await atualizarDadosInternos(criada.id, input);

    expect(atualizada.statusInterno).toBe("VAMOS_PARTICIPAR");
    expect(atualizada.valorProposta).toBe(45000);
    expect(atualizada.responsavel).toBe("Maria");
    expect(atualizada.observacoes).toBe("Cliente prioritário");
    expect(atualizada.orgaoNome).toBe(criada.orgaoNome);
    expect(atualizada.situacaoCompraNome).toBe(criada.situacaoCompraNome);
  });
});

describe("excluirLicitacao", () => {
  it("deletes the licitacao", async () => {
    vi.mocked(pncp.buscarContratacaoPNCP).mockResolvedValue(DADOS_PNCP_MOCK);
    const criada = await cadastrarLicitacao("01612441000107-1-000131/2026");

    await excluirLicitacao(criada.id);

    await expect(buscarLicitacao(criada.id)).rejects.toThrow("Não encontrado");
  });

  it("throws NotFoundError when deleting a missing licitacao", async () => {
    await expect(excluirLicitacao("id-inexistente")).rejects.toThrow("Não encontrado");
  });
});
