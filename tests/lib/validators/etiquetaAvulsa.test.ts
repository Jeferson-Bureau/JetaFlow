import { describe, it, expect } from "vitest";
import { etiquetaAvulsaInputSchema } from "@/lib/validators/etiquetaAvulsa";

describe("etiquetaAvulsaInputSchema", () => {
  it("accepts a valid input", () => {
    expect(etiquetaAvulsaInputSchema.safeParse({ descricao: "Amostra cliente X", quantidade: 3 }).success).toBe(true);
  });

  it("rejects an empty descricao", () => {
    expect(etiquetaAvulsaInputSchema.safeParse({ descricao: "", quantidade: 1 }).success).toBe(false);
  });

  it("trims whitespace from descricao", () => {
    const result = etiquetaAvulsaInputSchema.safeParse({ descricao: "  Amostra  ", quantidade: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descricao).toBe("Amostra");
    }
  });

  it("rejects quantidade <= 0", () => {
    expect(etiquetaAvulsaInputSchema.safeParse({ descricao: "Amostra", quantidade: 0 }).success).toBe(false);
    expect(etiquetaAvulsaInputSchema.safeParse({ descricao: "Amostra", quantidade: -1 }).success).toBe(false);
  });

  it("rejects quantidade above the 500 cap", () => {
    expect(etiquetaAvulsaInputSchema.safeParse({ descricao: "Amostra", quantidade: 501 }).success).toBe(false);
  });

  it("accepts quantidade at the 500 cap", () => {
    expect(etiquetaAvulsaInputSchema.safeParse({ descricao: "Amostra", quantidade: 500 }).success).toBe(true);
  });
});
