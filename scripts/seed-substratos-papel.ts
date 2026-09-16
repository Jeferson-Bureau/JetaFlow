import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fonte: referencias/JETAPRINT_Planilha_Custo_Papel.xlsx
// custoUnitario em R$/folha (preço da resma ÷ folhas por resma), unidade real de compra
// do papel. O motor de cálculo de orçamento (orcamentoCalculo.ts) trata substratos com
// unidadeMedida === "folha" multiplicando custoUnitario pela quantidade de folhas do item
// (informada manualmente), em vez de área × tiragem.
const substratos = [
  { nome: "Duplex 350g 66x96 (Battaglia)", custoUnitario: 2.219, atributos: { gramatura: "350g", formato: "66x96" } },
  { nome: "Sulfite 75g A4 (Suzano)", custoUnitario: 0.049, atributos: { gramatura: "75g", formato: "A4" } },
  { nome: "Sulfite 90g A4 (Suzano)", custoUnitario: 0.0612, atributos: { gramatura: "90g", formato: "A4" } },
  { nome: "Couché Brilho 115g 64x88 (Suzano)", custoUnitario: 0.5706, atributos: { gramatura: "115g", formato: "64x88" } },
  { nome: "Off-set 180g 66x96 (Chambril)", custoUnitario: 1.28, atributos: { gramatura: "180g", formato: "66x96" } },
  { nome: "Auto Copiativo CB 56g 66x96 (CAC)", custoUnitario: 0.796, atributos: { gramatura: "56g", formato: "66x96" } },
  { nome: "Auto Copiativo CFB 53g 66x96 (CAC)", custoUnitario: 0.952, atributos: { gramatura: "53g", formato: "66x96" } },
  { nome: "Auto Copiativo CF 53g 66x96 (CAC)", custoUnitario: 0.7348, atributos: { gramatura: "53g", formato: "66x96" } },
  { nome: "Couché Brilho 150g 66x96 (Designe)", custoUnitario: 0.86, atributos: { gramatura: "150g", formato: "66x96" } },
  { nome: "Couché Brilho 170g 66x96 (Designe)", custoUnitario: 0.956, atributos: { gramatura: "170g", formato: "66x96" } },
  { nome: "Triplex C2S 300g 66x96 (Ningbo Star)", custoUnitario: 1.7829, atributos: { gramatura: "300g", formato: "66x96" } },
];

async function main() {
  for (const s of substratos) {
    const data = {
      tipo: "PAPEL",
      unidadeMedida: "folha",
      custoUnitario: s.custoUnitario,
      percentualPerda: 0,
      markup: 0,
      atributos: JSON.stringify(s.atributos),
      ativo: true,
    };
    const existing = await prisma.substrato.findFirst({ where: { nome: s.nome } });
    if (existing) {
      await prisma.substrato.update({ where: { id: existing.id }, data });
      console.log(`Atualizado: ${s.nome} (R$ ${s.custoUnitario.toFixed(4)}/folha)`);
      continue;
    }
    await prisma.substrato.create({ data: { nome: s.nome, ...data } });
    console.log(`Criado: ${s.nome} (R$ ${s.custoUnitario.toFixed(4)}/folha)`);
  }
}

main().finally(() => prisma.$disconnect());
