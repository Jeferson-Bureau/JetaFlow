import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import ClienteForm from "@/components/forms/ClienteForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClienteForm", () => {
  it("autofills address fields after typing a CNPJ and blurring", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        razaoSocial: "JETAPRINT LTDA", cep: "12345000", endereco: "Rua A",
        numero: "100", bairro: "Centro", cidade: "São Paulo", uf: "SP",
      }),
    }));

    render(<ClienteForm />);
    const documento = screen.getByPlaceholderText("CNPJ");
    await userEvent.type(documento, "12345678000199");
    documento.blur();

    expect(await screen.findByDisplayValue("Rua A")).toBeInTheDocument();
  });
});
