import { z } from "zod";

export const volumeInputSchema = z.object({
  orcamentoItemId: z.string().nullable().optional(),
  quantidade: z.number().int().positive("Quantidade deve ser maior que zero"),
});

export const expedicaoInputSchema = z.object({
  volumes: z
    .array(volumeInputSchema)
    .min(1, "Informe ao menos um volume")
    .max(500, "Máximo de 500 volumes"),
  cep: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
  notaFiscal: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export type ExpedicaoInput = z.infer<typeof expedicaoInputSchema>;

export const conferirVolumeInputSchema = z.object({
  codigoInterno: z.string().trim().min(1, "Código obrigatório"),
});

export type ConferirVolumeInput = z.infer<typeof conferirVolumeInputSchema>;
