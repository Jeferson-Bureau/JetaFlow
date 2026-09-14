import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

const TABLES = [
  "OrcamentoItem", "Orcamento",
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];

beforeEach(async () => {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
