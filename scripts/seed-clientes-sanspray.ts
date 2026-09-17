import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fonte: documentos cadastrais em D:\JETAPRINT\Gráfica\Sanspray\Documentos
// (cartões CNPJ, contratos sociais, fichas cadastrais, alterações contratuais).
// Todas as 7 empresas pertencem ao mesmo grupo empresarial (marca "Sanspray"),
// mesmo polo industrial em Peabiru/PR. Dados de endereço/telefone extraídos do
// documento mais recente disponível quando houve divergência entre documentos.
const clientes = [
  {
    nome: "M F TAKAHASHI AQUECEDORES",
    nomeFantasia: "Takahashi Aquecedores",
    documento: "42699836000176",
    ie: "9090040801",
    telefone: "(44) 9845-0044",
    email: "",
    cep: "87250-000",
    endereco: "Rua Pista Exclusiva do Parque Industrial",
    numero: "S/N",
    complemento: "Cedime III, Sala 02",
    bairro: "Parque Industrial",
    cidade: "Peabiru",
    uf: "PR",
    observacoes:
      "Grupo Sanspray. Contato: Maria Fernanda Takahashi (titular). " +
      "E-mail localizado nos documentos é da contabilidade (brath.contabilidade@outlook.com), não da empresa.",
  },
  {
    nome: "MAXX POOL INDÚSTRIA E COMÉRCIO LTDA",
    nomeFantasia: "",
    documento: "57591607000100",
    ie: "91101186-75",
    telefone: "(44) 3017-1158",
    email: "maxxpoolindustria@gmail.com",
    cep: "87250-000",
    endereco: "Av José Moser",
    numero: "1076",
    complemento: "",
    bairro: "Centro",
    cidade: "Peabiru",
    uf: "PR",
    observacoes: "Grupo Sanspray.",
  },
  {
    nome: "CENTER POOL INDÚSTRIA E COMÉRCIO EIRELI",
    nomeFantasia: "",
    documento: "13532455000108",
    ie: "",
    telefone: "",
    email: "",
    cep: "87250-000",
    endereco: "Avenida Parque Industrial",
    numero: "S/N",
    complemento: "Quadra 05, Lote 01, Cedime I",
    bairro: "Parque Industrial",
    cidade: "Peabiru",
    uf: "PR",
    observacoes: "Grupo Sanspray. Contato: Elaine Cristina da Silva Areias (titular).",
  },
  {
    nome: "AQUECE INDUSTRIAL LTDA",
    nomeFantasia: "",
    documento: "52303285000133",
    ie: "9102895603",
    telefone: "(44) 3017-1158",
    email: "aqueceindustrial@gmail.com",
    cep: "87250-000",
    endereco: "Rua Projetada A",
    numero: "70-B",
    complemento: "Lote 9-A, Quadra 02",
    bairro: "Centro",
    cidade: "Peabiru",
    uf: "PR",
    observacoes: "Grupo Sanspray. Contato: Nathalya Silva da Rosa (sócia administradora).",
  },
  {
    nome: "AQUECEMAX INDÚSTRIA E COMÉRCIO EIRELI",
    nomeFantasia: "Sanspray",
    documento: "38312607000180",
    ie: "9085996085",
    telefone: "(44) 3531-1009",
    email: "",
    cep: "87250-000",
    endereco: "Rua A",
    numero: "70",
    complemento: "",
    bairro: "Parque Industrial",
    cidade: "Peabiru",
    uf: "PR",
    observacoes:
      "Grupo Sanspray (marca principal). Contatos: Elizete e Yasmin Cristina da Silva Areias (titular).",
  },
  {
    nome: "FHORTSOL INDÚSTRIA E COMÉRCIO LTDA",
    nomeFantasia: "Fhortsol",
    documento: "05019056000101",
    ie: "902575413-9",
    telefone: "(44) 3531-2828",
    email: "comprassanspray@gmail.com",
    cep: "87250-000",
    endereco: "Rua Pista Exclusiva do Parque Industrial (Marginal)",
    numero: "277",
    complemento: "Parque Industrial I",
    bairro: "Parque Industrial",
    cidade: "Peabiru",
    uf: "PR",
    observacoes:
      "Grupo Sanspray. Contatos: Eymy do Nascimento Silva da Rosa (gerente), Cezar Dantas Leite (comprador autorizado).",
  },
  {
    nome: "F M INDUSTRIAL LTDA",
    nomeFantasia: "F M P Fundição",
    documento: "07688335000193",
    ie: "90355928-46",
    telefone: "(44) 3531-1101",
    email: "financeiro@sanspray.com.br",
    cep: "87250-000",
    endereco: "Rodovia BR 158",
    numero: "S/N",
    complemento: "Cedime III, Sala 01",
    bairro: "Parque Industrial",
    cidade: "Peabiru",
    uf: "PR",
    observacoes:
      "Grupo Sanspray. Contato: Fabiano Leite da Rosa (sócio administrador). " +
      "E-mails setoriais: fiscal nfsanspray@gmail.com (Wesley), compras comprassanspray@gmail.com (Cezar). " +
      "Telefone da ficha cadastral tinha um dígito a mais (3531-11101); usado (44) 3531-1101.",
  },
];

async function main() {
  for (const c of clientes) {
    const data = { tipo: "PJ", ...c };
    const existing = await prisma.cliente.findUnique({ where: { documento: c.documento } });
    if (existing) {
      await prisma.cliente.update({ where: { id: existing.id }, data });
      console.log(`Atualizado: ${c.nome} (${c.documento})`);
      continue;
    }
    await prisma.cliente.create({ data });
    console.log(`Criado: ${c.nome} (${c.documento})`);
  }
}

main().finally(() => prisma.$disconnect());
