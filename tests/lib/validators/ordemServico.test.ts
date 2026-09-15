import { describe, it, expect } from "vitest";
import { ordemServicoInputSchema } from "@/lib/validators/ordemServico";

describe("ordemServicoInputSchema", () => {
  it("accepts a valid prazoEntrega and observacoes", () => {
    const result = ordemServicoInputSchema.safeParse({
      prazoEntrega: "2026-12-25",
      observacoes: "Entregar antes do meio-dia",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null prazoEntrega and observacoes", () => {
    const result = ordemServicoInputSchema.safeParse({ prazoEntrega: null, observacoes: null });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (both fields optional)", () => {
    const result = ordemServicoInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
