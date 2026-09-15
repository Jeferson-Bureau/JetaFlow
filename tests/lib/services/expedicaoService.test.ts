import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { gerarExpedicao, buscarExpedicaoPorOS, buscarExpedicao } from "@/lib/services/expedicaoService";

async function seedOS() {
  const cliente = await prisma.cliente.create({
    data: { tipo: "PJ", nome: "Cliente Teste", documento: "00000000000191" },
  });
  const orcamento = await prisma.orcamento.create({
    data: { numero: "ORC0001", clienteId: cliente.id, validadeDias: 15, status: "APROVADO" },
  });
  return prisma.ordemServico.create({
    data: { numero: "OS0001", orcamentoId: orcamento.id },
  });
}

describe("expedicaoService", () => {
  it("generates an expedicao with correctly numbered volumes", async () => {
    const os = await seedOS();
    const expedicao = await gerarExpedicao(os.id, { totalVolumes: 3 });

    expect(expedicao.totalVolumes).toBe(3);
    expect(expedicao.volumes).toHaveLength(3);
    expect(expedicao.volumes.map((v) => v.codigoInterno)).toEqual([
      "OS0001-01", "OS0001-02", "OS0001-03",
    ]);
    expect(expedicao.volumes.every((v) => v.conferido === false)).toBe(true);
  });

  it("rejects generating for a nonexistent OS", async () => {
    await expect(gerarExpedicao("id-inexistente", { totalVolumes: 1 })).rejects.toThrow(
      "Não encontrado"
    );
  });

  it("regenerating replaces the previous volumes and resets conference progress", async () => {
    // NOTE: gerarCodigoInterno(numeroOS, volumeNumero) is deterministic and the OS
    // number never changes across regenerations, so a *growing* totalVolumes (as in
    // the plan's original 2 -> 4 fixture) would always recreate volumes[0]'s old code
    // ("OS0001-01"), making a "the old code is gone" assertion unsatisfiable by any
    // implementation. Using a *shrinking* count (4 -> 2) instead lets us assert on a
    // volume number that genuinely falls out of range after regeneration.
    const os = await seedOS();
    const primeira = await gerarExpedicao(os.id, { totalVolumes: 4 });
    const codigoAntigo = primeira.volumes[3].codigoInterno;

    const segunda = await gerarExpedicao(os.id, { totalVolumes: 2, cidade: "Curitiba" });

    expect(segunda.totalVolumes).toBe(2);
    expect(segunda.volumes).toHaveLength(2);
    expect(segunda.cidade).toBe("Curitiba");

    const volumeAntigo = await prisma.volume.findUnique({ where: { codigoInterno: codigoAntigo } });
    expect(volumeAntigo).toBeNull();
  });

  it("stores editable address fields on the expedicao", async () => {
    const os = await seedOS();
    const expedicao = await gerarExpedicao(os.id, {
      totalVolumes: 1,
      cep: "80000-000",
      endereco: "Rua Teste",
      numero: "123",
      bairro: "Centro",
      cidade: "Curitiba",
      uf: "PR",
    });

    expect(expedicao.cep).toBe("80000-000");
    expect(expedicao.cidade).toBe("Curitiba");
    expect(expedicao.uf).toBe("PR");
  });

  it("buscarExpedicaoPorOS finds the expedicao by ordemServicoId", async () => {
    const os = await seedOS();
    await gerarExpedicao(os.id, { totalVolumes: 1 });

    const encontrada = await buscarExpedicaoPorOS(os.id);
    expect(encontrada.ordemServicoId).toBe(os.id);
  });

  it("buscarExpedicaoPorOS throws NotFoundError when none exists", async () => {
    const os = await seedOS();
    await expect(buscarExpedicaoPorOS(os.id)).rejects.toThrow("Não encontrado");
  });

  it("buscarExpedicao finds by its own id", async () => {
    const os = await seedOS();
    const criada = await gerarExpedicao(os.id, { totalVolumes: 1 });

    const encontrada = await buscarExpedicao(criada.id);
    expect(encontrada.id).toBe(criada.id);
  });
});
