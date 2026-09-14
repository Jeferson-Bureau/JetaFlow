import { describe, it, expect } from "vitest";
import { createSubstrato, listSubstratos, getSubstrato } from "@/lib/services/substratoService";
import { ForbiddenError } from "@/lib/errors";

const base = {
  nome: "Couché 300g", tipo: "PAPEL" as const, unidadeMedida: "folha",
  custoUnitario: 1.5, percentualPerda: 5, markup: 30,
  atributos: { gramatura: 300, formato: "66x96", acabamento: "brilho" },
  ativo: true,
};

describe("substratoService", () => {
  it("blocks OPERADOR from creating a substrato", async () => {
    await expect(createSubstrato("OPERADOR", base)).rejects.toThrow(ForbiddenError);
  });

  it("stores and returns atributos as an object for ADMIN", async () => {
    const created = await createSubstrato("ADMIN", base);
    expect(created.atributos).toEqual(base.atributos);
  });

  it("hides custoUnitario and markup for OPERADOR reads", async () => {
    const created = await createSubstrato("ADMIN", base);
    const found = (await getSubstrato("OPERADOR", created.id)) as Record<string, unknown>;
    expect(found.custoUnitario).toBeUndefined();
    expect(found.markup).toBeUndefined();
    expect(found.nome).toBe("Couché 300g");
  });

  it("shows custoUnitario and markup for ADMIN reads", async () => {
    const created = await createSubstrato("ADMIN", base);
    const found = (await getSubstrato("ADMIN", created.id)) as Record<string, unknown>;
    expect(found.custoUnitario).toBe(1.5);
  });

  it("filters by name in listSubstratos", async () => {
    await createSubstrato("ADMIN", base);
    const results = await listSubstratos("ADMIN", "couché");
    expect(results).toHaveLength(1);
  });
});
