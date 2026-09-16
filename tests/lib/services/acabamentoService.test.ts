import { describe, it, expect } from "vitest";
import { createAcabamento, listAcabamentos, getAcabamento, updateAcabamento, deleteAcabamento } from "@/lib/services/acabamentoService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const fixo = {
  nome: "Hot stamping", categoria: "HOT_STAMPING" as const, tipoCalculo: "FIXO" as const,
  valorFixo: 150, percentualPerda: 0, ativo: true,
};

const porUnidade = {
  nome: "Grampeamento", categoria: "GRAMPEAMENTO" as const, tipoCalculo: "POR_UNIDADE" as const,
  valorPorUnidade: 0.05, percentualPerda: 2, ativo: true,
};

describe("acabamentoService", () => {
  it("blocks OPERADOR from creating an acabamento", async () => {
    await expect(createAcabamento("OPERADOR", fixo)).rejects.toThrow(ForbiddenError);
  });

  it("creates an acabamento with valor fixo", async () => {
    const created = await createAcabamento("ADMIN", fixo);
    expect(created.valorFixo).toBe(150);
    expect(created.valorPorUnidade).toBeNull();
  });

  it("creates an acabamento with valor por unidade", async () => {
    const created = await createAcabamento("ADMIN", porUnidade);
    expect(created.valorPorUnidade).toBe(0.05);
    expect(created.valorFixo).toBeNull();
  });

  it("hides valorFixo and valorPorUnidade for OPERADOR reads", async () => {
    const created = await createAcabamento("ADMIN", fixo);
    const found = (await getAcabamento("OPERADOR", created.id)) as Record<string, unknown>;
    expect(found).not.toHaveProperty("valorFixo");
    expect(found).not.toHaveProperty("valorPorUnidade");
    expect(found.nome).toBe("Hot stamping");
  });

  it("shows valorFixo for ADMIN reads", async () => {
    const created = await createAcabamento("ADMIN", fixo);
    const found = (await getAcabamento("ADMIN", created.id)) as Record<string, unknown>;
    expect(found.valorFixo).toBe(150);
  });

  it("filters by name in listAcabamentos", async () => {
    await createAcabamento("ADMIN", fixo);
    await createAcabamento("ADMIN", porUnidade);
    const results = await listAcabamentos("ADMIN", "grampe");
    expect(results).toHaveLength(1);
  });

  it("updates an acabamento", async () => {
    const created = await createAcabamento("ADMIN", fixo);
    const updated = await updateAcabamento("ADMIN", created.id, { ...fixo, valorFixo: 200 });
    expect(updated.valorFixo).toBe(200);
  });

  it("throws NotFoundError when updating a missing acabamento", async () => {
    await expect(updateAcabamento("ADMIN", "missing-id", fixo)).rejects.toThrow(NotFoundError);
  });

  it("deletes an acabamento", async () => {
    const created = await createAcabamento("ADMIN", fixo);
    await deleteAcabamento("ADMIN", created.id);
    await expect(getAcabamento("ADMIN", created.id)).rejects.toThrow(NotFoundError);
  });

  it("blocks OPERADOR from deleting an acabamento", async () => {
    const created = await createAcabamento("ADMIN", fixo);
    await expect(deleteAcabamento("OPERADOR", created.id)).rejects.toThrow(ForbiddenError);
  });
});
