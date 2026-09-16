import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarEtiquetaAvulsa } from "@/lib/services/etiquetaAvulsaService";
import { gerarCodigoEtiquetaAvulsa } from "@/lib/services/etiquetaAvulsaCalculo";
import { EtiquetaAvulsaPdfDocument } from "@/lib/pdf/etiquetaAvulsaPdf";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const etiqueta = await buscarEtiquetaAvulsa(params.id);
    const codigos = Array.from({ length: etiqueta.quantidade }, (_, i) =>
      gerarCodigoEtiquetaAvulsa(etiqueta.id, i + 1)
    );
    const qrDataUris = await Promise.all(codigos.map((codigo) => QRCode.toDataURL(codigo)));

    const buffer = await renderToBuffer(
      <EtiquetaAvulsaPdfDocument
        descricao={etiqueta.descricao}
        codigos={codigos}
        qrDataUris={qrDataUris}
      />
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiquetas-avulsas-${etiqueta.id}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
