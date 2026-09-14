import { describe, it, expect } from "vitest";
import { getEmpresa, updateEmpresa } from "@/lib/services/configuracaoService";
import { ForbiddenError } from "@/lib/errors";

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
