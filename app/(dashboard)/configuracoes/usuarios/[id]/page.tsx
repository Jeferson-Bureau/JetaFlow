import { prisma } from "@/lib/prisma";
import UsuarioForm from "@/components/forms/UsuarioForm";
import { notFound } from "next/navigation";

export default async function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const usuario = await prisma.user.findUnique({ where: { id: params.id } });
  if (!usuario) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar usuário</h1>
      <UsuarioForm
        initial={{
          id: usuario.id, nome: usuario.nome, email: usuario.email, senha: "",
          role: usuario.role as "ADMIN" | "OPERADOR", ativo: usuario.ativo,
        }}
      />
    </div>
  );
}
