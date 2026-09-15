export interface CortePapel {
  pecas: number;
  larguraCm: number;
  alturaCm: number;
}

export interface FormatoPapel {
  larguraCm: number;
  alturaCm: number;
  cortes: CortePapel[];
}

export interface SugestaoAproveitamento {
  formatoPai: { larguraCm: number; alturaCm: number };
  corte: { larguraCm: number; alturaCm: number; pecas: number };
  folhasNecessarias: number;
}

export const FORMATOS_PAPEL: FormatoPapel[] = [
  {
    larguraCm: 50,
    alturaCm: 66,
    cortes: [
      { pecas: 2, larguraCm: 33, alturaCm: 50 },
      { pecas: 3, larguraCm: 22, alturaCm: 50 },
      { pecas: 4, larguraCm: 25, alturaCm: 33 },
      { pecas: 6, larguraCm: 22, alturaCm: 25 },
      { pecas: 8, larguraCm: 16.5, alturaCm: 25 },
      { pecas: 9, larguraCm: 16.67, alturaCm: 22 },
      { pecas: 10, larguraCm: 13.2, alturaCm: 25 },
      { pecas: 12, larguraCm: 16.5, alturaCm: 16.67 },
      { pecas: 15, larguraCm: 16.67, alturaCm: 13.2 },
      { pecas: 16, larguraCm: 12.5, alturaCm: 16.5 },
      { pecas: 18, larguraCm: 11, alturaCm: 16.67 },
    ],
  },
  {
    larguraCm: 55,
    alturaCm: 73,
    cortes: [
      { pecas: 2, larguraCm: 36.5, alturaCm: 55 },
      { pecas: 3, larguraCm: 24.3, alturaCm: 55 },
      { pecas: 4, larguraCm: 27.5, alturaCm: 36.5 },
      { pecas: 6, larguraCm: 24.3, alturaCm: 27.5 },
      { pecas: 8, larguraCm: 18.25, alturaCm: 27.5 },
      { pecas: 9, larguraCm: 18.3, alturaCm: 24.3 },
      { pecas: 10, larguraCm: 14.6, alturaCm: 27.5 },
      { pecas: 12, larguraCm: 18.25, alturaCm: 18.3 },
      { pecas: 15, larguraCm: 14.6, alturaCm: 18.3 },
      { pecas: 16, larguraCm: 13.75, alturaCm: 18.25 },
      { pecas: 18, larguraCm: 12.16, alturaCm: 18.3 },
    ],
  },
  {
    larguraCm: 64,
    alturaCm: 88,
    cortes: [
      { pecas: 2, larguraCm: 44, alturaCm: 64 },
      { pecas: 3, larguraCm: 29.3, alturaCm: 64 },
      { pecas: 4, larguraCm: 32, alturaCm: 44 },
      { pecas: 6, larguraCm: 29.33, alturaCm: 32 },
      { pecas: 6, larguraCm: 21.33, alturaCm: 44 },
      { pecas: 8, larguraCm: 22, alturaCm: 32 },
      { pecas: 9, larguraCm: 21.3, alturaCm: 29.3 },
      { pecas: 10, larguraCm: 17.6, alturaCm: 32 },
      { pecas: 12, larguraCm: 21.3, alturaCm: 22 },
      { pecas: 15, larguraCm: 17.6, alturaCm: 21.3 },
      { pecas: 16, larguraCm: 16, alturaCm: 17.6 },
      { pecas: 18, larguraCm: 14.6, alturaCm: 21.3 },
      { pecas: 24, larguraCm: 14.6, alturaCm: 16 },
      { pecas: 25, larguraCm: 12.6, alturaCm: 17.6 },
      { pecas: 32, larguraCm: 11, alturaCm: 16 },
    ],
  },
  {
    larguraCm: 66,
    alturaCm: 96,
    cortes: [
      { pecas: 2, larguraCm: 48, alturaCm: 66 },
      { pecas: 3, larguraCm: 32, alturaCm: 66 },
      { pecas: 4, larguraCm: 32, alturaCm: 48 },
      { pecas: 6, larguraCm: 32, alturaCm: 33 },
      { pecas: 6, larguraCm: 22, alturaCm: 48 },
      { pecas: 8, larguraCm: 24, alturaCm: 33 },
      { pecas: 9, larguraCm: 22, alturaCm: 32 },
      { pecas: 10, larguraCm: 19.2, alturaCm: 33 },
      { pecas: 12, larguraCm: 18, alturaCm: 33 },
      { pecas: 14, larguraCm: 22, alturaCm: 24 },
      { pecas: 15, larguraCm: 19.2, alturaCm: 22 },
      { pecas: 16, larguraCm: 16.5, alturaCm: 24 },
      { pecas: 18, larguraCm: 16, alturaCm: 22 },
      { pecas: 24, larguraCm: 16, alturaCm: 16.5 },
      { pecas: 26, larguraCm: 13.2, alturaCm: 19.2 },
      { pecas: 32, larguraCm: 12, alturaCm: 16.5 },
    ],
  },
  {
    larguraCm: 72,
    alturaCm: 102,
    cortes: [
      { pecas: 2, larguraCm: 72, alturaCm: 51 },
      { pecas: 3, larguraCm: 72, alturaCm: 34 },
      { pecas: 4, larguraCm: 36, alturaCm: 51 },
      { pecas: 6, larguraCm: 36, alturaCm: 34 },
      { pecas: 6, larguraCm: 24, alturaCm: 51 },
      { pecas: 8, larguraCm: 36, alturaCm: 25.5 },
      { pecas: 9, larguraCm: 24, alturaCm: 34 },
      { pecas: 10, larguraCm: 36, alturaCm: 20.4 },
      { pecas: 12, larguraCm: 24, alturaCm: 25.5 },
      { pecas: 15, larguraCm: 24, alturaCm: 20.4 },
      { pecas: 16, larguraCm: 18, alturaCm: 20.4 },
      { pecas: 18, larguraCm: 24, alturaCm: 17 },
      { pecas: 23, larguraCm: 20.4, alturaCm: 18 },
      { pecas: 24, larguraCm: 17, alturaCm: 18 },
      { pecas: 25, larguraCm: 14.4, alturaCm: 17 },
      { pecas: 32, larguraCm: 18, alturaCm: 12.75 },
    ],
  },
  {
    larguraCm: 76,
    alturaCm: 112,
    cortes: [
      { pecas: 2, larguraCm: 56, alturaCm: 76 },
      { pecas: 3, larguraCm: 37.3, alturaCm: 76 },
      { pecas: 4, larguraCm: 36, alturaCm: 56 },
      { pecas: 6, larguraCm: 37.3, alturaCm: 38 },
      { pecas: 6, larguraCm: 25.3, alturaCm: 56 },
      { pecas: 8, larguraCm: 28, alturaCm: 38 },
      { pecas: 9, larguraCm: 25.3, alturaCm: 37.3 },
      { pecas: 10, larguraCm: 22.4, alturaCm: 38 },
      { pecas: 12, larguraCm: 25.3, alturaCm: 38 },
      { pecas: 15, larguraCm: 22.4, alturaCm: 25.3 },
      { pecas: 16, larguraCm: 19, alturaCm: 22.4 },
      { pecas: 18, larguraCm: 18.7, alturaCm: 25.3 },
      { pecas: 23, larguraCm: 16.6, alturaCm: 25.3 },
      { pecas: 24, larguraCm: 18.6, alturaCm: 19 },
      { pecas: 25, larguraCm: 15.2, alturaCm: 18.6 },
      { pecas: 32, larguraCm: 14, alturaCm: 19 },
    ],
  },
  {
    larguraCm: 77,
    alturaCm: 113,
    cortes: [
      { pecas: 2, larguraCm: 56.6, alturaCm: 77 },
      { pecas: 3, larguraCm: 37.6, alturaCm: 77 },
      { pecas: 4, larguraCm: 38.5, alturaCm: 56.5 },
      { pecas: 6, larguraCm: 37.6, alturaCm: 38.5 },
      { pecas: 6, larguraCm: 25.6, alturaCm: 56.6 },
      { pecas: 8, larguraCm: 28.25, alturaCm: 38.5 },
      { pecas: 9, larguraCm: 25.6, alturaCm: 37.6 },
      { pecas: 10, larguraCm: 22.6, alturaCm: 38.5 },
      { pecas: 12, larguraCm: 25.6, alturaCm: 28.25 },
      { pecas: 15, larguraCm: 22.6, alturaCm: 25.6 },
      { pecas: 16, larguraCm: 19.25, alturaCm: 22.6 },
      { pecas: 18, larguraCm: 18.8, alturaCm: 25.6 },
      { pecas: 20, larguraCm: 19.25, alturaCm: 22.6 },
      { pecas: 24, larguraCm: 18.8, alturaCm: 19.25 },
      { pecas: 25, larguraCm: 15.4, alturaCm: 18.8 },
      { pecas: 32, larguraCm: 14.125, alturaCm: 19.25 },
    ],
  },
  {
    larguraCm: 87,
    alturaCm: 114,
    cortes: [
      { pecas: 2, larguraCm: 57, alturaCm: 87 },
      { pecas: 3, larguraCm: 38, alturaCm: 87 },
      { pecas: 4, larguraCm: 43.5, alturaCm: 57 },
      { pecas: 6, larguraCm: 38, alturaCm: 43.5 },
      { pecas: 6, larguraCm: 29, alturaCm: 57 },
      { pecas: 8, larguraCm: 28.5, alturaCm: 43.5 },
      { pecas: 9, larguraCm: 29, alturaCm: 38 },
      { pecas: 10, larguraCm: 22.8, alturaCm: 43.5 },
      { pecas: 12, larguraCm: 28.5, alturaCm: 29 },
      { pecas: 15, larguraCm: 22.8, alturaCm: 29 },
      { pecas: 16, larguraCm: 21.75, alturaCm: 28.5 },
      { pecas: 18, larguraCm: 19, alturaCm: 29 },
      { pecas: 24, larguraCm: 19, alturaCm: 21.75 },
      { pecas: 25, larguraCm: 17.4, alturaCm: 22.8 },
      { pecas: 32, larguraCm: 14.25, alturaCm: 21.75 },
    ],
  },
  {
    larguraCm: 89,
    alturaCm: 117,
    cortes: [
      { pecas: 2, larguraCm: 58.5, alturaCm: 89 },
      { pecas: 3, larguraCm: 39, alturaCm: 89 },
      { pecas: 4, larguraCm: 44.5, alturaCm: 58.5 },
      { pecas: 6, larguraCm: 39, alturaCm: 44.5 },
      { pecas: 6, larguraCm: 29.6, alturaCm: 58.5 },
      { pecas: 8, larguraCm: 29.25, alturaCm: 44.5 },
      { pecas: 9, larguraCm: 29.6, alturaCm: 39 },
      { pecas: 10, larguraCm: 23.4, alturaCm: 44.5 },
      { pecas: 12, larguraCm: 29.25, alturaCm: 29.6 },
      { pecas: 15, larguraCm: 23.4, alturaCm: 29.6 },
      { pecas: 16, larguraCm: 22.25, alturaCm: 29.25 },
      { pecas: 18, larguraCm: 19.5, alturaCm: 29.6 },
      { pecas: 24, larguraCm: 19.5, alturaCm: 22.25 },
      { pecas: 25, larguraCm: 17.8, alturaCm: 23.4 },
      { pecas: 32, larguraCm: 14.62, alturaCm: 22.25 },
    ],
  },
];

export function sugerirAproveitamento(
  larguraCm: number,
  alturaCm: number,
  tiragem: number
): SugestaoAproveitamento[] {
  if (larguraCm <= 0 || alturaCm <= 0 || tiragem <= 0) return [];

  const candidatos: SugestaoAproveitamento[] = [];

  for (const formato of FORMATOS_PAPEL) {
    for (const corte of formato.cortes) {
      const cabeNormal = larguraCm <= corte.larguraCm && alturaCm <= corte.alturaCm;
      const cabeRotacionado = alturaCm <= corte.larguraCm && larguraCm <= corte.alturaCm;
      if (cabeNormal || cabeRotacionado) {
        candidatos.push({
          formatoPai: { larguraCm: formato.larguraCm, alturaCm: formato.alturaCm },
          corte: { larguraCm: corte.larguraCm, alturaCm: corte.alturaCm, pecas: corte.pecas },
          folhasNecessarias: Math.ceil(tiragem / corte.pecas),
        });
      }
    }
  }

  candidatos.sort((a, b) => b.corte.pecas - a.corte.pecas);
  return candidatos;
}
