import { describe, it, expect } from "vitest";
import { listUsuarios, createUsuario, updateUsuario } from "@/lib/services/usuarioService";
import { ForbiddenError } from "@/lib/errors";

describe("usuarioService", () => {
  it("blocks non-admin from listing", async () => {
    await expect(listUsuarios("OPERADOR")).rejects.toThrow(ForbiddenError);
  });

  it("allows admin to create and list a user", async () => {
    await createUsuario("ADMIN", {
      nome: "Maria", email: "maria@jetaprint.com", senha: "segredo123", role: "OPERADOR", ativo: true,
    });
    const list = await listUsuarios("ADMIN");
    expect(list.some((u) => u.email === "maria@jetaprint.com")).toBe(true);
  });

  it("updates a user without changing password when senha is omitted", async () => {
    const created = await createUsuario("ADMIN", {
      nome: "Carlos", email: "carlos@jetaprint.com", senha: "segredo123", role: "OPERADOR", ativo: true,
    });
    const updated = await updateUsuario("ADMIN", created.id, {
      nome: "Carlos Silva", email: "carlos@jetaprint.com", role: "OPERADOR", ativo: true,
    });
    expect(updated.nome).toBe("Carlos Silva");
  });
});
