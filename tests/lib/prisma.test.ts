import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma client", () => {
  it("creates and retrieves a User", async () => {
    const user = await prisma.user.create({
      data: { nome: "Admin", email: "admin@jetaprint.com", senhaHash: "x", role: "ADMIN" },
    });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("admin@jetaprint.com");
  });
});
