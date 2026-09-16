import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import EtiquetaAvulsaForm from "@/components/forms/EtiquetaAvulsaForm";

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("EtiquetaAvulsaForm", () => {
  it("submits descricao and quantidade, then calls onCreated and clears the fields", async () => {
    const criada = { id: "1", descricao: "Amostra cliente X", quantidade: 3, createdAt: new Date().toISOString() };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => criada }));
    const onCreated = vi.fn();

    render(<EtiquetaAvulsaForm onCreated={onCreated} />);
    await userEvent.type(screen.getByPlaceholderText("Descrição"), "Amostra cliente X");
    await userEvent.clear(screen.getByPlaceholderText("Quantidade"));
    await userEvent.type(screen.getByPlaceholderText("Quantidade"), "3");
    await userEvent.click(screen.getByRole("button", { name: /gerar etiquetas/i }));

    expect(await screen.findByPlaceholderText("Descrição")).toHaveValue("");
    expect(onCreated).toHaveBeenCalledWith(criada);
    expect(fetch).toHaveBeenCalledWith(
      "/api/etiquetas-avulsas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ descricao: "Amostra cliente X", quantidade: 3 }),
      })
    );
  });

  it("shows the server error message when creation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Descrição obrigatória" }),
    }));

    render(<EtiquetaAvulsaForm onCreated={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("Descrição"), "Amostra");
    await userEvent.click(screen.getByRole("button", { name: /gerar etiquetas/i }));

    expect(await screen.findByText("Descrição obrigatória")).toBeInTheDocument();
  });
});
