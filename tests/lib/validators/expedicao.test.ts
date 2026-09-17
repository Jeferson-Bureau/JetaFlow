import { describe, it, expect } from "vitest";
import { expedicaoInputSchema, conferirVolumeInputSchema } from "@/lib/validators/expedicao";

describe("expedicaoInputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      expedicaoInputSchema.safeParse({ volumes: [{ orcamentoItemId: "item-1", quantidade: 3 }] }).success
    ).toBe(true);
  });

  it("rejects an empty volumes array", () => {
    expect(expedicaoInputSchema.safeParse({ volumes: [] }).success).toBe(false);
  });

  it("rejects a volume with quantidade <= 0", () => {
    expect(
      expedicaoInputSchema.safeParse({ volumes: [{ orcamentoItemId: "item-1", quantidade: 0 }] }).success
    ).toBe(false);
    expect(
      expedicaoInputSchema.safeParse({ volumes: [{ orcamentoItemId: "item-1", quantidade: -1 }] }).success
    ).toBe(false);
  });

  it("accepts a volume with a null orcamentoItemId", () => {
    expect(
      expedicaoInputSchema.safeParse({ volumes: [{ orcamentoItemId: null, quantidade: 3 }] }).success
    ).toBe(true);
  });

  it("accepts null address fields", () => {
    const result = expedicaoInputSchema.safeParse({
      volumes: [{ orcamentoItemId: "item-1", quantidade: 1 }],
      cep: null, endereco: null, numero: null,
      complemento: null, bairro: null, cidade: null, uf: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 500 volumes", () => {
    const volumes = Array.from({ length: 501 }, () => ({ orcamentoItemId: "item-1", quantidade: 1 }));
    expect(expedicaoInputSchema.safeParse({ volumes }).success).toBe(false);
  });

  it("accepts exactly 500 volumes", () => {
    const volumes = Array.from({ length: 500 }, () => ({ orcamentoItemId: "item-1", quantidade: 1 }));
    expect(expedicaoInputSchema.safeParse({ volumes }).success).toBe(true);
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
