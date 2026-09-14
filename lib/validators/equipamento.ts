import { z } from "zod";

export const tiposEquipamento = ["DIGITAL", "OFFSET"] as const;

export const equipamentoSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(tiposEquipamento),
  velocidade: z.number().positive(),
  unidadeVelocidade: z.string().min(1, "Unidade de velocidade obrigatória"),
  formatoMaximo: z.string().min(1, "Formato máximo obrigatório"),
  custoHora: z.number().nonnegative(),
  tempoSetupMin: z.number().int().nonnegative(),
  percentualPerda: z.number().min(0).max(100).default(0),
  acabamentosSuportados: z.array(z.string()),
  ativo: z.boolean().default(true),
});

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;
