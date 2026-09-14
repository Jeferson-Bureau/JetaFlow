import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("segredo123");
    expect(hash).not.toBe("segredo123");
    expect(await verifyPassword("segredo123", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("segredo123");
    expect(await verifyPassword("errada", hash)).toBe(false);
  });
});
