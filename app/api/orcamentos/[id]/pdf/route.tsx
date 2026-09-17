import { NextRequest, NextResponse } from "next/server";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarOrcamento } from "@/lib/services/orcamentoService";
import { renderPdfInWorker } from "@/lib/pdf/renderPdfInWorker";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const role = await getSessionRole();
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const orcamento = await buscarOrcamento(params.id);
    const buffer = await renderPdfInWorker({ type: "orcamento", props: { orcamento } });
    const numeroSanitizado = orcamento.numero.replace(/[^A-Za-z0-9_-]/g, "");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${numeroSanitizado}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
