import { prisma } from "@/lib/prisma";
import UsuarioForm from "@/components/forms/UsuarioForm";
import { notFound } from "next/navigation";
import { getSessionRole, isAdmin } from "@/lib/permissions";

export default async function EditarUsuarioPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!isAdmin(role)) notFound();

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
