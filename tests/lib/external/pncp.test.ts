import { describe, it, expect, vi, afterEach } from "vitest";
import { parseNumeroControlePNCP, buscarContratacaoPNCP } from "@/lib/external/pncp";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseNumeroControlePNCP", () => {
  it("parses a valid Número de Controle PNCP", () => {
    const result = parseNumeroControlePNCP("01612441000107-1-000131/2026");
    expect(result).toEqual({ cnpj: "01612441000107", ano: 2026, sequencial: 131 });
  });

  it("returns null for an invalid format", () => {
    expect(parseNumeroControlePNCP("nao-e-um-numero-valido")).toBeNull();
    expect(parseNumeroControlePNCP("")).toBeNull();
    expect(parseNumeroControlePNCP("123-1-000131/2026")).toBeNull();
  });

  it("trims surrounding whitespace before parsing", () => {
    const result = parseNumeroControlePNCP("  01612441000107-1-000131/2026  ");
    expect(result).toEqual({ cnpj: "01612441000107", ano: 2026, sequencial: 131 });
  });
});

describe("buscarContratacaoPNCP", () => {
  it("maps a successful response to PncpContratacaoResult", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        orgaoEntidade: { razaoSocial: "MUNICIPIO DE BELA VISTA DO CAROBA" },
        unidadeOrgao: { nomeUnidade: "Prefeitura Municipal de Bela Vista da Caroba" },
        numeroCompra: "PR53",
        objetoCompra: "Contratação de licença de uso de software",
        modalidadeNome: "Pregão - Eletrônico",
        situacaoCompraNome: "Divulgada no PNCP",
        valorTotalEstimado: 46150,
        valorTotalHomologado: null,
        dataAberturaProposta: "2026-08-25T08:00:01",
        dataEncerramentoProposta: "2026-09-10T08:00:01",
      }),
    }));

    const result = await buscarContratacaoPNCP("01612441000107", 2026, 131);
    expect(result?.orgaoNome).toBe("MUNICIPIO DE BELA VISTA DO CAROBA");
    expect(result?.numeroCompra).toBe("PR53");
    expect(result?.valorTotalEstimado).toBe(46150);
    expect(result?.valorTotalHomologado).toBeNull();
  });

  it("returns null when the API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await buscarContratacaoPNCP("00000000000000", 2026, 1);
    expect(result).toBeNull();
  });

  it("returns null when fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await buscarContratacaoPNCP("01612441000107", 2026, 131);
    expect(result).toBeNull();
  });

  it("sends a User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        orgaoEntidade: {}, unidadeOrgao: {}, numeroCompra: "", objetoCompra: "",
        modalidadeNome: "", situacaoCompraNome: "",
        valorTotalEstimado: null, valorTotalHomologado: null,
        dataAberturaProposta: null, dataEncerramentoProposta: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await buscarContratacaoPNCP("01612441000107", 2026, 131);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["User-Agent"]).toBeTruthy();
  });
});
