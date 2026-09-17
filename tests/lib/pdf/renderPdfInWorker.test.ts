import { describe, it, expect } from "vitest";
import { renderPdfInWorker } from "@/lib/pdf/renderPdfInWorker";

// These spawn a real child process and render a real PDF — no mocking — because
// this exact path (react-pdf inside Next's app-router module graph) is what
// silently threw "Objects are not valid as a React child" on every request
// despite tsc/build passing clean. See pdfWorker.tsx for the full story.
describe("renderPdfInWorker", () => {
  it("renders an etiqueta PDF for a real expedicao", async () => {
    const buffer = await renderPdfInWorker({
      type: "etiqueta",
      props: {
        expedicao: {
          id: "exp-1", ordemServicoId: "os-1", cep: null, endereco: null, numero: null,
          complemento: null, bairro: null, cidade: null, uf: null, createdAt: new Date(),
          volumes: [
            {
              id: "v1", expedicaoId: "exp-1", numero: 1, codigoInterno: "OS0001-01",
              quantidade: 10, orcamentoItemId: null, conferido: false, conferidoEm: null,
              orcamentoItem: null,
            },
          ],
        } as never,
        numeroOS: "OS0001",
        clienteNome: "Cliente Teste",
        quantidadeTotalPedido: 10,
        divergente: false,
        qrDataUris: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="],
      },
    });

    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 20000);

  it("renders an orcamento PDF", async () => {
    const buffer = await renderPdfInWorker({
      type: "orcamento",
      props: {
        orcamento: {
          numero: "ORC0001", validadeDias: 15, observacoes: null,
          cliente: { nome: "Cliente Teste" },
          itens: [{ id: "item-1", descricao: "Banner", tiragem: 10, precoFinal: 100 }],
        } as never,
      },
    });

    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 20000);

  it("renders an etiqueta avulsa PDF", async () => {
    const buffer = await renderPdfInWorker({
      type: "etiquetaAvulsa",
      props: {
        descricao: "Caixa genérica",
        codigos: ["AV-01"],
      },
    });

    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 20000);

  it("rejects when the worker throws", async () => {
    await expect(
      renderPdfInWorker({
        type: "orcamento",
        props: { orcamento: null } as never,
      })
    ).rejects.toThrow();
  }, 20000);
});
