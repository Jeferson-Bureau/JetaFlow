import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fonte: referencias/JETAPRINT_Planilha_Custo_Papel.xlsx
// custoUnitario convertido de preço por resma para R$/m², que é a unidade usada
// pelo cálculo de orçamento (areaM2 * tiragem * custoUnitario em orcamentoCalculo.ts).
const substratos = [
  { nome: "Duplex 350g 66x96 (Battaglia)", custoUnitario: 3.5022, atributos: { gramatura: "350g", formato: "66x96" } },
  { nome: "Sulfite 75g A4 (Suzano)", custoUnitario: 0.7856, atributos: { gramatura: "75g", formato: "A4" } },
  { nome: "Sulfite 90g A4 (Suzano)", custoUnitario: 0.9812, atributos: { gramatura: "90g", formato: "A4" } },
  { nome: "Couché Brilho 115g 64x88 (Suzano)", custoUnitario: 1.0131, atributos: { gramatura: "115g", formato: "64x88" } },
  { nome: "Off-set 180g 66x96 (Chambril)", custoUnitario: 2.0202, atributos: { gramatura: "180g", formato: "66x96" } },
  { nome: "Auto Copiativo CB 56g 66x96 (CAC)", custoUnitario: 1.2563, atributos: { gramatura: "56g", formato: "66x96" } },
  { nome: "Auto Copiativo CFB 53g 66x96 (CAC)", custoUnitario: 1.5025, atributos: { gramatura: "53g", formato: "66x96" } },
  { nome: "Auto Copiativo CF 53g 66x96 (CAC)", custoUnitario: 1.1597, atributos: { gramatura: "53g", formato: "66x96" } },
  { nome: "Couché Brilho 150g 66x96 (Designe)", custoUnitario: 1.3573, atributos: { gramatura: "150g", formato: "66x96" } },
  { nome: "Couché Brilho 170g 66x96 (Designe)", custoUnitario: 1.5088, atributos: { gramatura: "170g", formato: "66x96" } },
  { nome: "Triplex C2S 300g 66x96 (Ningbo Star)", custoUnitario: 2.8139, atributos: { gramatura: "300g", formato: "66x96" } },
];

async function main() {
  for (const s of substratos) {
    const existing = await prisma.substrato.findFirst({ where: { nome: s.nome } });
    if (existing) {
      console.log(`Já existe, pulando: ${s.nome}`);
      continue;
    }
    await prisma.substrato.create({
      data: {
        nome: s.nome,
        tipo: "PAPEL",
        unidadeMedida: "m²",
        custoUnitario: s.custoUnitario,
        percentualPerda: 0,
        markup: 0,
        atributos: JSON.stringify(s.atributos),
        ativo: true,
      },
    });
    console.log(`Criado: ${s.nome} (R$ ${s.custoUnitario.toFixed(4)}/m²)`);
  }
}

main().finally(() => prisma.$disconnect());
