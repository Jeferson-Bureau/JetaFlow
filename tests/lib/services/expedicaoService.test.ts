import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  gerarExpedicao, buscarExpedicaoPorOS, buscarExpedicao, conferirVolume, listarExpedicoes,
} from "@/lib/services/expedicaoService";

function volumes(...quantidades: number[]) {
  return quantidades.map((quantidade) => ({ orcamentoItemId: null, quantidade }));
}

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
    const expedicao = await gerarExpedicao(os.id, { volumes: volumes(10, 10, 10) });

    expect(expedicao.volumes).toHaveLength(3);
    expect(expedicao.volumes.map((v) => v.codigoInterno)).toEqual([
      "OS0001-01", "OS0001-02", "OS0001-03",
    ]);
    expect(expedicao.volumes.map((v) => v.quantidade)).toEqual([10, 10, 10]);
    expect(expedicao.volumes.every((v) => v.conferido === false)).toBe(true);
  });

  it("rejects generating for a nonexistent OS", async () => {
    await expect(gerarExpedicao("id-inexistente", { volumes: volumes(1) })).rejects.toThrow(
      "Não encontrado"
    );
  });

  it("regenerating replaces the previous volumes and resets conference progress", async () => {
    // NOTE: gerarCodigoInterno(numeroOS, volumeNumero) is deterministic and the OS
    // number never changes across regenerations, so a *growing* volume count (as in
    // the plan's original 2 -> 4 fixture) would always recreate volumes[0]'s old code
    // ("OS0001-01"), making a "the old code is gone" assertion unsatisfiable by any
    // implementation. Using a *shrinking* count (4 -> 2) instead lets us assert on a
    // volume number that genuinely falls out of range after regeneration.
    const os = await seedOS();
    const primeira = await gerarExpedicao(os.id, { volumes: volumes(5, 5, 5, 5) });
    const codigoAntigo = primeira.volumes[3].codigoInterno;

    const segunda = await gerarExpedicao(os.id, { volumes: volumes(10, 10), cidade: "Curitiba" });

    expect(segunda.volumes).toHaveLength(2);
    expect(segunda.cidade).toBe("Curitiba");

    const volumeAntigo = await prisma.volume.findUnique({ where: { codigoInterno: codigoAntigo } });
    expect(volumeAntigo).toBeNull();
  });

  it("stores editable address fields on the expedicao", async () => {
    const os = await seedOS();
    const expedicao = await gerarExpedicao(os.id, {
      volumes: volumes(1),
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

  it("stores an optional nota fiscal and observações on the expedicao", async () => {
    const os = await seedOS();
    const expedicao = await gerarExpedicao(os.id, {
      volumes: volumes(1),
      notaFiscal: "NF-12345",
      observacoes: "Entregar somente em horário comercial",
    });

    expect(expedicao.notaFiscal).toBe("NF-12345");
    expect(expedicao.observacoes).toBe("Entregar somente em horário comercial");
  });

  it("defaults nota fiscal and observações to null when omitted", async () => {
    const os = await seedOS();
    const expedicao = await gerarExpedicao(os.id, { volumes: volumes(1) });

    expect(expedicao.notaFiscal).toBeNull();
    expect(expedicao.observacoes).toBeNull();
  });

  it("links a volume to an orcamentoItem when informed", async () => {
    const os = await seedOS();
    const ordem = await prisma.ordemServico.findUniqueOrThrow({
      where: { id: os.id },
      include: { orcamento: true },
    });
    const substrato = await prisma.substrato.create({
      data: { nome: "Lona", tipo: "LONA", unidadeMedida: "m2", custoUnitario: 1, atributos: "{}" },
    });
    const equipamento = await prisma.equipamento.create({
      data: {
        nome: "Plotter", tipo: "DIGITAL", velocidade: 10, unidadeVelocidade: "m2/h",
        formatoMaximo: "A0", custoHora: 1, tempoSetupMin: 5, acabamentosSuportados: "[]",
      },
    });
    const item = await prisma.orcamentoItem.create({
      data: {
        orcamentoId: ordem.orcamentoId,
        descricao: "Banner",
        tipo: "DIGITAL",
        substratoId: substrato.id,
        larguraCm: 100,
        alturaCm: 100,
        tiragem: 10,
        equipamentoId: equipamento.id,
        margemLucro: 1,
        custoCalculado: 1,
        precoFinal: 1,
        ordem: 0,
      },
    });

    const expedicao = await gerarExpedicao(os.id, {
      volumes: [{ orcamentoItemId: item.id, quantidade: 10 }],
    });

    expect(expedicao.volumes[0].orcamentoItemId).toBe(item.id);
  });

  it("buscarExpedicaoPorOS finds the expedicao by ordemServicoId", async () => {
    const os = await seedOS();
    await gerarExpedicao(os.id, { volumes: volumes(1) });

    const encontrada = await buscarExpedicaoPorOS(os.id);
    expect(encontrada.ordemServicoId).toBe(os.id);
  });

  it("buscarExpedicaoPorOS throws NotFoundError when none exists", async () => {
    const os = await seedOS();
    await expect(buscarExpedicaoPorOS(os.id)).rejects.toThrow("Não encontrado");
  });

  it("buscarExpedicao finds by its own id", async () => {
    const os = await seedOS();
    const criada = await gerarExpedicao(os.id, { volumes: volumes(1) });

    const encontrada = await buscarExpedicao(criada.id);
    expect(encontrada.id).toBe(criada.id);
  });

  describe("conferirVolume", () => {
    it("marks the matching volume as conferido", async () => {
      const os = await seedOS();
      const expedicao = await gerarExpedicao(os.id, { volumes: volumes(5, 5) });
      const codigo = expedicao.volumes[0].codigoInterno;

      const atualizada = await conferirVolume(expedicao.id, codigo);
      const volumeAtualizado = atualizada.volumes.find((v) => v.codigoInterno === codigo);

      expect(volumeAtualizado?.conferido).toBe(true);
      expect(volumeAtualizado?.conferidoEm).not.toBeNull();
    });

    it("rejects an unknown codigoInterno", async () => {
      const os = await seedOS();
      const expedicao = await gerarExpedicao(os.id, { volumes: volumes(1) });

      await expect(conferirVolume(expedicao.id, "CODIGO-INEXISTENTE")).rejects.toThrow(
        "Código não encontrado nesta expedição"
      );
    });

    it("rejects a codigoInterno that belongs to a different expedicao", async () => {
      const os1 = await seedOS();
      const expedicao1 = await gerarExpedicao(os1.id, { volumes: volumes(1) });

      const cliente2 = await prisma.cliente.create({
        data: { tipo: "PJ", nome: "Cliente 2", documento: "00000000000272" },
      });
      const orcamento2 = await prisma.orcamento.create({
        data: { numero: "ORC0002", clienteId: cliente2.id, validadeDias: 15, status: "APROVADO" },
      });
      const os2 = await prisma.ordemServico.create({
        data: { numero: "OS0002", orcamentoId: orcamento2.id },
      });
      const expedicao2 = await gerarExpedicao(os2.id, { volumes: volumes(1) });

      const codigoDaExpedicao1 = expedicao1.volumes[0].codigoInterno;

      await expect(conferirVolume(expedicao2.id, codigoDaExpedicao1)).rejects.toThrow(
        "Código não encontrado nesta expedição"
      );
    });

    it("rejects re-scanning an already-conferred volume", async () => {
      const os = await seedOS();
      const expedicao = await gerarExpedicao(os.id, { volumes: volumes(1) });
      const codigo = expedicao.volumes[0].codigoInterno;

      await conferirVolume(expedicao.id, codigo);
      await expect(conferirVolume(expedicao.id, codigo)).rejects.toThrow(
        "Este volume já foi conferido"
      );
    });
  });

  describe("listarExpedicoes", () => {
    it("returns an empty list when none exist", async () => {
      expect(await listarExpedicoes()).toEqual([]);
    });

    it("lists expedicoes with OS/cliente context and conference progress", async () => {
      const os = await seedOS();
      const expedicao = await gerarExpedicao(os.id, { volumes: volumes(5, 5) });
      await conferirVolume(expedicao.id, expedicao.volumes[0].codigoInterno);

      const lista = await listarExpedicoes();

      expect(lista).toHaveLength(1);
      expect(lista[0]).toMatchObject({
        id: expedicao.id,
        ordemServicoId: os.id,
        numeroOS: "OS0001",
        clienteNome: "Cliente Teste",
        totalVolumes: 2,
        volumesConferidos: 1,
      });
    });

    it("orders by most recently generated first", async () => {
      const os1 = await seedOS();
      const primeira = await gerarExpedicao(os1.id, { volumes: volumes(1) });

      const cliente2 = await prisma.cliente.create({
        data: { tipo: "PJ", nome: "Cliente 2", documento: "00000000000272" },
      });
      const orcamento2 = await prisma.orcamento.create({
        data: { numero: "ORC0002", clienteId: cliente2.id, validadeDias: 15, status: "APROVADO" },
      });
      const os2 = await prisma.ordemServico.create({
        data: { numero: "OS0002", orcamentoId: orcamento2.id },
      });
      const segunda = await gerarExpedicao(os2.id, { volumes: volumes(1) });

      const lista = await listarExpedicoes();
      expect(lista.map((e) => e.id)).toEqual([segunda.id, primeira.id]);
    });
  });
});
