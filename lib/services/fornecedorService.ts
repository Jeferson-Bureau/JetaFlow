import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { FornecedorInput } from "@/lib/validators/fornecedor";

export async function listFornecedores(search?: string) {
  const all = await prisma.fornecedor.findMany({ orderBy: { razaoSocial: "asc" } });
  if (!search) return all;
  const query = search.toLowerCase();
  return all.filter((f) => f.razaoSocial.toLowerCase().includes(query) || f.cnpj.includes(query));
}

export async function getFornecedor(id: string) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } });
  if (!fornecedor) throw new NotFoundError("Fornecedor não encontrado");
  return fornecedor;
}

export async function createFornecedor(input: FornecedorInput) {
  return prisma.fornecedor.create({ data: input });
}

export async function updateFornecedor(id: string, input: FornecedorInput) {
  await getFornecedor(id);
  return prisma.fornecedor.update({ where: { id }, data: input });
}

export async function deleteFornecedor(id: string) {
  await getFornecedor(id);
  await prisma.fornecedor.delete({ where: { id } });
}
