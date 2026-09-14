import { describe, it, expect } from "vitest";
import { createFornecedor, listFornecedores, getFornecedor, updateFornecedor, deleteFornecedor } from "@/lib/services/fornecedorService";
import { NotFoundError } from "@/lib/errors";

const base = { razaoSocial: "Papelaria Central", cnpj: "98765432000188", categoria: "papel" };

describe("fornecedorService", () => {
  it("creates and finds a fornecedor by search", async () => {
    await createFornecedor(base);
    const results = await listFornecedores("papelaria");
    expect(results).toHaveLength(1);
  });

  it("throws NotFoundError for a missing id", async () => {
    await expect(getFornecedor("id-inexistente")).rejects.toThrow(NotFoundError);
  });

  it("updates a fornecedor", async () => {
    const created = await createFornecedor(base);
    const updated = await updateFornecedor(created.id, { ...base, razaoSocial: "Papelaria Nova" });
    expect(updated.razaoSocial).toBe("Papelaria Nova");
  });

  it("deletes a fornecedor", async () => {
    const created = await createFornecedor(base);
    await deleteFornecedor(created.id);
    await expect(getFornecedor(created.id)).rejects.toThrow(NotFoundError);
  });
});
