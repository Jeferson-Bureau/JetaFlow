import { z } from "zod";

export const fornecedorSchema = z.object({
  razaoSocial: z.string().min(1, "Razão social obrigatória"),
  cnpj: z.string().min(11, "CNPJ inválido"),
  contato: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  categoria: z.string().optional(),
});

export type FornecedorInput = z.infer<typeof fornecedorSchema>;
