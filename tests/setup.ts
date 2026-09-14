import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

const TABLES = [
  "Cliente", "Fornecedor", "Substrato", "Equipamento",
  "User", "ConfiguracaoGeral", "NumeracaoDocumento", "ParametroCalculo",
];

beforeEach(async () => {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});
