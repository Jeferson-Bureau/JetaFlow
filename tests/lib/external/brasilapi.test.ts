import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupCnpj } from "@/lib/external/brasilapi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupCnpj", () => {
  it("maps a successful response to CnpjResult", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        razao_social: "JETAPRINT LTDA", nome_fantasia: "JetaPrint", cep: "12345000", logradouro: "Rua A",
        numero: "100", bairro: "Centro", municipio: "São Paulo", uf: "SP",
      }),
    }));

    const result = await lookupCnpj("12.345.678/0001-99");
    expect(result?.razaoSocial).toBe("JETAPRINT LTDA");
    expect(result?.nomeFantasia).toBe("JetaPrint");
    expect(result?.uf).toBe("SP");
  });

  it("returns null when the API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await lookupCnpj("00000000000000");
    expect(result).toBeNull();
  });
});
