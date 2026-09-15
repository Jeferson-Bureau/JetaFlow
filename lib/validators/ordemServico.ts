import { z } from "zod";

export const ordemServicoInputSchema = z.object({
  prazoEntrega: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .nullable()
    .optional(),
  observacoes: z.string().nullable().optional(),
});

export type OrdemServicoInput = z.infer<typeof ordemServicoInputSchema>;
