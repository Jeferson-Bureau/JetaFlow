import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupCep } from "@/lib/external/viacep";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupCep", () => {
  it("maps a successful response to CepResult", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: "Rua A", bairro: "Centro", localidade: "São Paulo", uf: "SP" }),
    }));

    const result = await lookupCep("12345-000");
    expect(result?.endereco).toBe("Rua A");
  });

  it("returns null when ViaCEP reports an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) }));
    const result = await lookupCep("00000000");
    expect(result).toBeNull();
  });
});
