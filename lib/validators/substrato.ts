import { z } from "zod";

export const tiposSubstrato = [
  "PAPEL", "LONA", "ADESIVO", "PVC", "ACRILICO", "CHAPA_OFFSET", "TINTA", "VERNIZ", "LAMINADO",
] as const;

export const substratoSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(tiposSubstrato),
  fornecedorId: z.string().optional(),
  unidadeMedida: z.string().min(1, "Unidade de medida obrigatória"),
  custoUnitario: z.number().nonnegative(),
  percentualPerda: z.number().min(0).max(100).default(0),
  markup: z.number().min(0).default(0),
  atributos: z.record(z.string(), z.union([z.string(), z.number()])),
  ativo: z.boolean().default(true),
});

export type SubstratoInput = z.infer<typeof substratoSchema>;
