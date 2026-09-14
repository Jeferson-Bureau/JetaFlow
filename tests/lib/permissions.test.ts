import { describe, it, expect } from "vitest";
import { isAdmin } from "@/lib/permissions";

describe("isAdmin", () => {
  it("returns true for ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
  });

  it("returns false for OPERADOR", () => {
    expect(isAdmin("OPERADOR")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAdmin(null)).toBe(false);
  });
});
