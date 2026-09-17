import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSessionRole } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-helpers";
import { buscarExpedicao } from "@/lib/services/expedicaoService";
import { buscarOrdemServico } from "@/lib/services/ordemServicoService";
import { calcularDivergenciasPorItem } from "@/lib/services/expedicaoCalculo";
import { renderPdfInWorker } from "@/lib/pdf/renderPdfInWorker";

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

    const itens = os.orcamento.itens.map((item) => ({
      id: item.id, descricao: item.descricao, tiragem: item.tiragem,
    }));
    const quantidadeTotalPedido = itens.reduce((soma, item) => soma + item.tiragem, 0);
    const divergencias = calcularDivergenciasPorItem(
      itens,
      expedicao.volumes.map((v) => ({ orcamentoItemId: v.orcamentoItemId, quantidade: v.quantidade }))
    );
    const divergente = divergencias.some((d) => d.divergente);

    const buffer = await renderPdfInWorker({
      type: "etiqueta",
      props: {
        expedicao, numeroOS: os.numero, clienteNome: os.orcamento.cliente.nome,
        quantidadeTotalPedido, divergente, qrDataUris,
      },
    });

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
