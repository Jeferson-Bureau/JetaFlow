import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { authorizeCredentials } from "@/lib/auth";

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await prisma.user.create({
      data: {
        nome: "Admin",
        email: "admin@jetaprint.com",
        senhaHash: await hashPassword("segredo123"),
        role: "ADMIN",
        ativo: true,
      },
    });
  });

  it("returns the user when credentials are valid", async () => {
    const result = await authorizeCredentials({ email: "admin@jetaprint.com", password: "segredo123" });
    expect(result?.email).toBe("admin@jetaprint.com");
    expect(result?.role).toBe("ADMIN");
  });

  it("returns null when the password is wrong", async () => {
    const result = await authorizeCredentials({ email: "admin@jetaprint.com", password: "errada" });
    expect(result).toBeNull();
  });

  it("returns null for an inactive user", async () => {
    await prisma.user.update({ where: { email: "admin@jetaprint.com" }, data: { ativo: false } });
    const result = await authorizeCredentials({ email: "admin@jetaprint.com", password: "segredo123" });
    expect(result).toBeNull();
  });
});
