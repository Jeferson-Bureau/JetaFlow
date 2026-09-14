import { describe, it, expect } from "vitest";
import { getEmpresa, updateEmpresa, listNumeracoes, updateNumeracao, getParametros, updateParametros } from "@/lib/services/configuracaoService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("configuracaoService — empresa", () => {
  it("blocks OPERADOR", async () => {
    await expect(getEmpresa("OPERADOR")).rejects.toThrow(ForbiddenError);
  });

  it("creates the singleton row on first read", async () => {
    const empresa = await getEmpresa("ADMIN");
    expect(empresa.id).toBe(1);
  });

  it("updates empresa fields for ADMIN", async () => {
    const updated = await updateEmpresa("ADMIN", {
      razaoSocial: "JETAPRINT LTDA", cnpj: "12345678000199", ie: "", endereco: "",
      telefone: "11999998888", whatsappNumero: "11999998888", temaPadrao: "AUTOMATICO",
    });
    expect(updated.razaoSocial).toBe("JETAPRINT LTDA");
  });
});

describe("configuracaoService — numeração", () => {
  it("seeds ORCAMENTO and OS rows on first read", async () => {
    const rows = await listNumeracoes("ADMIN");
    expect(rows.map((r) => r.tipoDocumento).sort()).toEqual(["ORCAMENTO", "OS"]);
  });

  it("updates a numeração row", async () => {
    await listNumeracoes("ADMIN");
    const updated = await updateNumeracao("ADMIN", "ORCAMENTO", { prefixo: "ORC", proximoNumero: 42, digitos: 4 });
    expect(updated.proximoNumero).toBe(42);
  });

  it("throws NotFoundError for an unknown tipoDocumento", async () => {
    await expect(
      updateNumeracao("ADMIN", "INEXISTENTE", { prefixo: "X", proximoNumero: 1, digitos: 4 })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("configuracaoService — parâmetros", () => {
  it("creates the singleton row on first read", async () => {
    const parametros = await getParametros("ADMIN");
    expect(parametros.id).toBe(1);
  });

  it("updates parâmetros for ADMIN", async () => {
    const updated = await updateParametros("ADMIN", {
      margemLucroPadrao: 25, custoMaoObraHoraPadrao: 40, percentualCustosIndiretosPadrao: 10,
    });
    expect(updated.margemLucroPadrao).toBe(25);
  });
});
