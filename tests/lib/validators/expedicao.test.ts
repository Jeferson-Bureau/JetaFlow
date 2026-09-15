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
});

describe("conferirVolumeInputSchema", () => {
  it("accepts a non-empty codigoInterno", () => {
    expect(conferirVolumeInputSchema.safeParse({ codigoInterno: "OS0001-01" }).success).toBe(true);
  });

  it("rejects an empty codigoInterno", () => {
    expect(conferirVolumeInputSchema.safeParse({ codigoInterno: "" }).success).toBe(false);
  });
});
