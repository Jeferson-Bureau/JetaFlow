import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { OrcamentoPdfDocument } from "@/lib/pdf/orcamentoPdf";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await buscarOrcamento(params.id);
    const buffer = await renderToBuffer(<OrcamentoPdfDocument orcamento={orcamento} />);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${orcamento.numero}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
