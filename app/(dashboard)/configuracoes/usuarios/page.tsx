"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Usuario { id: string; nome: string; email: string; role: string; ativo: boolean; }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsuarios(data);
        } else {
          setErro(data?.error ?? "Erro ao carregar");
        }
      });
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marinho">Usuários</h1>
        <Link href="/configuracoes/usuarios/novo" className="rounded bg-ciano px-4 py-2 text-white">Novo usuário</Link>
      </div>
      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}
      <table className="w-full text-left">
        <thead><tr className="border-b"><th className="py-2">Nome</th><th className="py-2">E-mail</th><th className="py-2">Perfil</th><th className="py-2">Status</th></tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/configuracoes/usuarios/${u.id}`}>{u.nome}</Link></td>
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.role}</td>
              <td className="py-2">{u.ativo ? "Ativo" : "Inativo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
