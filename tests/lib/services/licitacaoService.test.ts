import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as pncp from "@/lib/external/pncp";
import { cadastrarLicitacao, listarLicitacoes, buscarLicitacao } from "@/lib/services/licitacaoService";

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
