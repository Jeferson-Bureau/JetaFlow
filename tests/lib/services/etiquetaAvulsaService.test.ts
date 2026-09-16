import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  criarEtiquetaAvulsa, listarEtiquetasAvulsas, buscarEtiquetaAvulsa,
} from "@/lib/services/etiquetaAvulsaService";

describe("etiquetaAvulsaService", () => {
  describe("criarEtiquetaAvulsa", () => {
    it("creates an etiqueta avulsa with descricao and quantidade", async () => {
      const criada = await criarEtiquetaAvulsa({ descricao: "Amostra cliente X", quantidade: 3 });

      expect(criada.descricao).toBe("Amostra cliente X");
      expect(criada.quantidade).toBe(3);

      const naBase = await prisma.etiquetaAvulsa.findUnique({ where: { id: criada.id } });
      expect(naBase).not.toBeNull();
    });
  });

  describe("listarEtiquetasAvulsas", () => {
    it("returns an empty list when none exist", async () => {
      expect(await listarEtiquetasAvulsas()).toEqual([]);
    });

    it("orders by most recently created first", async () => {
      const primeira = await criarEtiquetaAvulsa({ descricao: "Primeira", quantidade: 1 });
      const segunda = await criarEtiquetaAvulsa({ descricao: "Segunda", quantidade: 2 });

      const lista = await listarEtiquetasAvulsas();

      expect(lista.map((e) => e.id)).toEqual([segunda.id, primeira.id]);
    });
  });

  describe("buscarEtiquetaAvulsa", () => {
    it("finds by its own id", async () => {
      const criada = await criarEtiquetaAvulsa({ descricao: "Amostra", quantidade: 1 });

      const encontrada = await buscarEtiquetaAvulsa(criada.id);
      expect(encontrada.id).toBe(criada.id);
    });

    it("throws NotFoundError when it does not exist", async () => {
      await expect(buscarEtiquetaAvulsa("id-inexistente")).rejects.toThrow("Não encontrado");
    });
  });
});
