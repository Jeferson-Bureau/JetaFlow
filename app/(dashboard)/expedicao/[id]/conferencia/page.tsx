import { notFound } from "next/navigation";
import { buscarExpedicao } from "@/lib/services/expedicaoService";
import { NotFoundError } from "@/lib/errors";
import ConferenciaClient from "./ConferenciaClient";

export default async function ConferenciaPage({ params }: { params: { id: string } }) {
  let expedicao;
  try {
    expedicao = await buscarExpedicao(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <ConferenciaClient
      expedicaoId={expedicao.id}
      volumes={expedicao.volumes.map((v) => ({
        id: v.id,
        numero: v.numero,
        codigoInterno: v.codigoInterno,
        conferido: v.conferido,
        conferidoEm: v.conferidoEm ? v.conferidoEm.toISOString() : null,
      }))}
    />
  );
}
