import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarExpedicao } from "@/lib/services/expedicaoService";
import { buscarOrdemServico } from "@/lib/services/ordemServicoService";
import { EtiquetaPdfDocument } from "@/lib/pdf/etiquetaPdf";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const expedicao = await buscarExpedicao(params.id);
    const os = await buscarOrdemServico(expedicao.ordemServicoId);
    const qrDataUris = await Promise.all(
      expedicao.volumes.map((volume) => QRCode.toDataURL(volume.codigoInterno))
    );

    const buffer = await renderToBuffer(
      <EtiquetaPdfDocument
        expedicao={expedicao}
        numeroOS={os.numero}
        clienteNome={os.orcamento.cliente.nome}
        qrDataUris={qrDataUris}
      />
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiquetas-${os.numero}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
