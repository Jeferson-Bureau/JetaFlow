import { z } from "zod";

export const empresaSchema = z.object({
  razaoSocial: z.string().min(1),
  cnpj: z.string().min(1),
  ie: z.string().optional().default(""),
  endereco: z.string().optional().default(""),
  telefone: z.string().optional().default(""),
  whatsappNumero: z.string().optional().default(""),
  temaPadrao: z.enum(["CLARO", "ESCURO", "AUTOMATICO"]),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;

export const numeracaoSchema = z.object({
  prefixo: z.string().min(1),
  proximoNumero: z.number().int().positive(),
  digitos: z.number().int().min(1).max(10),
});

export type NumeracaoInput = z.infer<typeof numeracaoSchema>;

export const parametrosSchema = z.object({
  margemLucroPadrao: z.number().min(0),
  custoMaoObraHoraPadrao: z.number().min(0),
  percentualCustosIndiretosPadrao: z.number().min(0),
  impostosPercentualPadrao: z.number().min(0),
  comissaoPercentualPadrao: z.number().min(0),
  despesasFinanceirasPercentualPadrao: z.number().min(0),
});

export type ParametrosInput = z.infer<typeof parametrosSchema>;
