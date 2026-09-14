import { describe, it, expect } from "vitest";
import { createCliente, listClientes, getCliente, updateCliente, deleteCliente } from "@/lib/services/clienteService";
import { NotFoundError } from "@/lib/errors";

const base = { tipo: "PJ" as const, nome: "Gráfica Exemplo", documento: "12345678000199" };

describe("clienteService", () => {
  it("creates and finds a cliente by search", async () => {
    await createCliente(base);
    const results = await listClientes("gráfica");
    expect(results).toHaveLength(1);
  });

  it("throws NotFoundError for a missing id", async () => {
    await expect(getCliente("id-inexistente")).rejects.toThrow(NotFoundError);
  });

  it("updates a cliente", async () => {
    const created = await createCliente(base);
    const updated = await updateCliente(created.id, { ...base, nome: "Gráfica Nova" });
    expect(updated.nome).toBe("Gráfica Nova");
  });

  it("deletes a cliente", async () => {
    const created = await createCliente(base);
    await deleteCliente(created.id);
    await expect(getCliente(created.id)).rejects.toThrow(NotFoundError);
  });
});
