import { z } from "zod";

export const etiquetaAvulsaInputSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição obrigatória"),
  quantidade: z
    .number()
    .int()
    .positive("Quantidade deve ser maior que zero")
    .max(500, "Máximo de 500 etiquetas"),
});

export type EtiquetaAvulsaInput = z.infer<typeof etiquetaAvulsaInputSchema>;
