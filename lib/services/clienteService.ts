import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { ClienteInput } from "@/lib/validators/cliente";

export async function listClientes(search?: string) {
  const all = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  if (!search) return all;
  const query = search.toLowerCase();
  return all.filter((c) => c.nome.toLowerCase().includes(query) || c.documento.includes(query));
}

export async function getCliente(id: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new NotFoundError("Cliente não encontrado");
  return cliente;
}

export async function createCliente(input: ClienteInput) {
  return prisma.cliente.create({ data: input });
}

export async function updateCliente(id: string, input: ClienteInput) {
  await getCliente(id);
  return prisma.cliente.update({ where: { id }, data: input });
}

export async function deleteCliente(id: string) {
  await getCliente(id);
  await prisma.cliente.delete({ where: { id } });
}
