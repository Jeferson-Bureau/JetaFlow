import { prisma } from "@/lib/prisma";
import FornecedorForm from "@/components/forms/FornecedorForm";
import { notFound } from "next/navigation";

export default async function EditarFornecedorPage({ params }: { params: { id: string } }) {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id: params.id } });
  if (!fornecedor) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marinho">Editar fornecedor</h1>
      <FornecedorForm
        initial={{
          id: fornecedor.id, razaoSocial: fornecedor.razaoSocial, cnpj: fornecedor.cnpj,
          contato: fornecedor.contato ?? "", telefone: fornecedor.telefone ?? "", email: fornecedor.email ?? "",
          cep: fornecedor.cep ?? "", endereco: fornecedor.endereco ?? "", numero: fornecedor.numero ?? "",
          complemento: fornecedor.complemento ?? "", bairro: fornecedor.bairro ?? "", cidade: fornecedor.cidade ?? "",
          uf: fornecedor.uf ?? "", categoria: fornecedor.categoria ?? "",
        }}
      />
    </div>
  );
}
