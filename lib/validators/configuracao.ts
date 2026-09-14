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
