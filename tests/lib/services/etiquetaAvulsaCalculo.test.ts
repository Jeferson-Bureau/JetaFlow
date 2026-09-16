import { describe, it, expect } from "vitest";
import { gerarCodigoEtiquetaAvulsa } from "@/lib/services/etiquetaAvulsaCalculo";

describe("gerarCodigoEtiquetaAvulsa", () => {
  it("pads single-digit sequence numbers to 2 digits", () => {
    expect(gerarCodigoEtiquetaAvulsa("abc123", 1)).toBe("AVABC123-01");
    expect(gerarCodigoEtiquetaAvulsa("abc123", 9)).toBe("AVABC123-09");
  });

  it("does not truncate two-or-more-digit sequence numbers", () => {
    expect(gerarCodigoEtiquetaAvulsa("abc123", 10)).toBe("AVABC123-10");
    expect(gerarCodigoEtiquetaAvulsa("abc123", 123)).toBe("AVABC123-123");
  });
});
