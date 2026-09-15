import { describe, it, expect } from "vitest";
import { expedicaoInputSchema, conferirVolumeInputSchema } from "@/lib/validators/expedicao";

describe("expedicaoInputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(expedicaoInputSchema.safeParse({ totalVolumes: 3 }).success).toBe(true);
  });

  it("rejects totalVolumes <= 0", () => {
    expect(expedicaoInputSchema.safeParse({ totalVolumes: 0 }).success).toBe(false);
    expect(expedicaoInputSchema.safeParse({ totalVolumes: -1 }).success).toBe(false);
  });

  it("accepts null address fields", () => {
    const result = expedicaoInputSchema.safeParse({
      totalVolumes: 1, cep: null, endereco: null, numero: null,
      complemento: null, bairro: null, cidade: null, uf: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects totalVolumes above the 500 cap", () => {
    expect(expedicaoInputSchema.safeParse({ totalVolumes: 501 }).success).toBe(false);
  });

  it("accepts totalVolumes at the 500 cap", () => {
    expect(expedicaoInputSchema.safeParse({ totalVolumes: 500 }).success).toBe(true);
  });
});

describe("conferirVolumeInputSchema", () => {
  it("accepts a non-empty codigoInterno", () => {
    expect(conferirVolumeInputSchema.safeParse({ codigoInterno: "OS0001-01" }).success).toBe(true);
  });

  it("rejects an empty codigoInterno", () => {
    expect(conferirVolumeInputSchema.safeParse({ codigoInterno: "" }).success).toBe(false);
  });

  it("trims whitespace from codigoInterno", () => {
    const result = conferirVolumeInputSchema.safeParse({ codigoInterno: "  OS0001-01  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.codigoInterno).toBe("OS0001-01");
    }
  });
});
