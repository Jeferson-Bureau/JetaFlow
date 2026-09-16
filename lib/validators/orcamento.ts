import { z } from "zod";

export const orcamentoItemAcabamentoInputSchema = z
  .object({
    acabamentoId: z.string().nullable().optional(),
    descricaoAvulsa: z.string().nullable().optional(),
    quantidade: z.number().positive().nullable().optional(),
    valorAvulso: z.number().min(0).nullable().optional(),
  })
  .refine((a) => Boolean(a.acabamentoId) !== Boolean(a.descricaoAvulsa), {
    message: "Informe um acabamento do catálogo ou uma descrição avulsa, não ambos",
    path: ["acabamentoId"],
  })
  .refine((a) => !a.descricaoAvulsa || (a.valorAvulso !== null && a.valorAvulso !== undefined), {
    message: "Valor obrigatório para acabamento avulso",
    path: ["valorAvulso"],
  });

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
    coresFrente: z.number().int().positive().nullable().optional(),
    coresVerso: z.number().int().nonnegative().nullable().optional(),
    tintaId: z.string().nullable().optional(),
    tintaQuantidade: z.number().positive().nullable().optional(),
    substratoFolhas: z.number().positive().nullable().optional(),
    acabamentos: z.array(orcamentoItemAcabamentoInputSchema).default([]),
    tipoMarkup: z.enum(["MULTIPLICADOR", "DIVISOR"]).default("MULTIPLICADOR"),
    margemLucro: z.number().min(0),
  })
  .refine(
    (item) =>
      item.tipo === "OFFSET" ||
      (!item.chapaId && !item.coresFrente && !item.coresVerso && !item.tintaId && !item.tintaQuantidade),
    {
      message: "Chapa e tinta só podem ser usadas em itens OFFSET",
      path: ["chapaId"],
    }
  )
  .refine((item) => Boolean(item.chapaId) === Boolean(item.coresFrente), {
    message: "Informe as cores da frente junto com a chapa selecionada",
    path: ["coresFrente"],
  })
  .refine((item) => Boolean(item.chapaId) || (item.coresVerso === null || item.coresVerso === undefined), {
    message: "Cores do verso só podem ser informadas junto com a chapa selecionada",
    path: ["coresVerso"],
  })
  .refine((item) => Boolean(item.tintaId) === Boolean(item.tintaQuantidade), {
    message: "Informe a quantidade de tinta junto com a tinta selecionada",
    path: ["tintaQuantidade"],
  });

export const orcamentoInputSchema = z.object({
  clienteId: z.string().min(1, "Cliente obrigatório"),
  observacoes: z.string().nullable().optional(),
  itens: z.array(orcamentoItemInputSchema).min(1, "Orçamento precisa de ao menos um item"),
});

export type OrcamentoItemAcabamentoInput = z.infer<typeof orcamentoItemAcabamentoInputSchema>;
export type OrcamentoItemInput = z.infer<typeof orcamentoItemInputSchema>;
export type OrcamentoInput = z.infer<typeof orcamentoInputSchema>;
