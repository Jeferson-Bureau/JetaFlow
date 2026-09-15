import { z } from "zod";

export const expedicaoInputSchema = z.object({
  totalVolumes: z.number().int().positive(),
  cep: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
});

export type ExpedicaoInput = z.infer<typeof expedicaoInputSchema>;

export const conferirVolumeInputSchema = z.object({
  codigoInterno: z.string().min(1, "Código obrigatório"),
});

export type ConferirVolumeInput = z.infer<typeof conferirVolumeInputSchema>;
