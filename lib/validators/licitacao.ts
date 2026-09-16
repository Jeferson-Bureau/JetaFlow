import { z } from "zod";
import { STATUS_INTERNO_LICITACAO } from "@/lib/services/licitacaoCalculo";

export const licitacaoInputSchema = z.object({
  numeroControlePNCP: z.string().min(1, "Número de Controle PNCP obrigatório"),
});

export type LicitacaoInput = z.infer<typeof licitacaoInputSchema>;

export const licitacaoInternoInputSchema = z.object({
  statusInterno: z.enum(STATUS_INTERNO_LICITACAO),
  valorProposta: z.number().nullable().optional(),
  responsavel: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export type LicitacaoInternoInput = z.infer<typeof licitacaoInternoInputSchema>;
