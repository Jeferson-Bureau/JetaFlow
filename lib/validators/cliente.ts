import { z } from "zod";

export const clienteSchema = z.object({
  tipo: z.enum(["PF", "PJ"]),
  nome: z.string().min(1, "Nome obrigatório"),
  nomeFantasia: z.string().optional(),
  documento: z.string().min(11, "CPF/CNPJ inválido"),
  ie: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  prazoPagamento: z.number().int().nonnegative().optional(),
  observacoes: z.string().optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
