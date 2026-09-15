import { z } from "zod";

export const ordemServicoInputSchema = z.object({
  prazoEntrega: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export type OrdemServicoInput = z.infer<typeof ordemServicoInputSchema>;
