import { describe, it, expect } from "vitest";
import { createEquipamento, listEquipamentos, getEquipamento } from "@/lib/services/equipamentoService";
import { ForbiddenError } from "@/lib/errors";

const base = {
  nome: "HP Indigo 12000", tipo: "DIGITAL" as const, velocidade: 4600, unidadeVelocidade: "folhas/hora",
  formatoMaximo: "72x104cm", custoHora: 350, tempoSetupMin: 15, percentualPerda: 3,
  acabamentosSuportados: ["laminação", "verniz UV"], ativo: true,
};

describe("equipamentoService", () => {
  it("blocks OPERADOR from creating an equipamento", async () => {
    await expect(createEquipamento("OPERADOR", base)).rejects.toThrow(ForbiddenError);
  });

  it("hides custoHora for OPERADOR reads", async () => {
    const created = await createEquipamento("ADMIN", base);
    const found = (await getEquipamento("OPERADOR", created.id)) as Record<string, unknown>;
    expect(found).not.toHaveProperty("custoHora");
    expect(found.nome).toBe("HP Indigo 12000");
  });

  it("shows custoHora for ADMIN reads", async () => {
    const created = await createEquipamento("ADMIN", base);
    const found = (await getEquipamento("ADMIN", created.id)) as Record<string, unknown>;
    expect(found).toHaveProperty("custoHora");
    expect(found.custoHora).toBe(350);
  });

  it("hides custoHora for OPERADOR reads via listEquipamentos", async () => {
    await createEquipamento("ADMIN", base);
    const results = (await listEquipamentos("OPERADOR")) as Record<string, unknown>[];
    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      expect(item).not.toHaveProperty("custoHora");
    }
  });

  it("filters by name in listEquipamentos", async () => {
    await createEquipamento("ADMIN", base);
    const results = await listEquipamentos("ADMIN", "indigo");
    expect(results).toHaveLength(1);
  });
});
