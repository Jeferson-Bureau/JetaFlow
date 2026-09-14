import { z } from "zod";

export const usuarioSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
  role: z.enum(["ADMIN", "OPERADOR"]),
  ativo: z.boolean().default(true),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
