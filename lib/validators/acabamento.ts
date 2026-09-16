import { z } from "zod";

export const categoriasAcabamento = [
  "LAMINACAO", "VERNIZ", "CORTE_VINCO", "DOBRA", "GRAMPEAMENTO",
  "ENCADERNACAO", "COLAGEM", "HOT_STAMPING", "RELEVO", "OUTRO",
] as const;

export const tiposCalculoAcabamento = ["FIXO", "POR_UNIDADE"] as const;

export const acabamentoSchema = z
  .object({
    nome: z.string().min(1, "Nome obrigatório"),
    categoria: z.enum(categoriasAcabamento),
    tipoCalculo: z.enum(tiposCalculoAcabamento),
    valorFixo: z.number().nonnegative().optional(),
    valorPorUnidade: z.number().nonnegative().optional(),
    percentualPerda: z.number().min(0).max(100).default(0),
    ativo: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.tipoCalculo === "FIXO" && data.valorFixo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valor fixo obrigatório quando o tipo de cálculo é FIXO",
        path: ["valorFixo"],
      });
    }
    if (data.tipoCalculo === "POR_UNIDADE" && data.valorPorUnidade === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valor por unidade obrigatório quando o tipo de cálculo é POR_UNIDADE",
        path: ["valorPorUnidade"],
      });
    }
  });

export type AcabamentoInput = z.infer<typeof acabamentoSchema>;
