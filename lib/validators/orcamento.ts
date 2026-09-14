import { z } from "zod";

export const orcamentoItemInputSchema = z
  .object({
    descricao: z.string().min(1, "Descrição obrigatória"),
    tipo: z.enum(["DIGITAL", "OFFSET"]),
    substratoId: z.string().min(1, "Substrato obrigatório"),
    larguraCm: z.number().positive("Largura deve ser maior que zero"),
    alturaCm: z.number().positive("Altura deve ser maior que zero"),
    tiragem: z.number().int().positive("Tiragem deve ser maior que zero"),
    equipamentoId: z.string().min(1, "Equipamento obrigatório"),
    chapaId: z.string().nullable().optional(),
    chapaQuantidade: z.number().positive().nullable().optional(),
    tintaId: z.string().nullable().optional(),
    tintaQuantidade: z.number().positive().nullable().optional(),
    acabamentoDescricao: z.string().nullable().optional(),
    acabamentoCusto: z.number().min(0).default(0),
    margemLucro: z.number().min(0),
  })
  .refine((item) => item.tipo === "OFFSET" || (!item.chapaId && !item.tintaId), {
    message: "Chapa e tinta só podem ser usadas em itens OFFSET",
    path: ["chapaId"],
  });

export const orcamentoInputSchema = z.object({
  clienteId: z.string().min(1, "Cliente obrigatório"),
  observacoes: z.string().nullable().optional(),
  itens: z.array(orcamentoItemInputSchema).min(1, "Orçamento precisa de ao menos um item"),
});

export type OrcamentoItemInput = z.infer<typeof orcamentoItemInputSchema>;
export type OrcamentoInput = z.infer<typeof orcamentoInputSchema>;
