import { describe, it, expect } from "vitest";
import tailwindConfig from "../tailwind.config";

describe("tailwind theme tokens", () => {
  it("defines all JETAPRINT palette colors", () => {
    const colors = (tailwindConfig.theme?.extend as any)?.colors;
    expect(colors.marinho).toBe("#1B3A66");
    expect(colors.ciano).toBe("#229DCF");
    expect(colors.amarelo).toBe("#FBC64B");
    expect(colors.rosa).toBe("#E23D7D");
  });
});
