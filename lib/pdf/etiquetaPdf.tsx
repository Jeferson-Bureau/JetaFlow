import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ExpedicaoComVolumes } from "@/lib/services/expedicaoService";

// Folha A4 retrato, 4 etiquetas horizontais empilhadas por página
// (842pt de altura útil ÷ 4 ≈ 180pt por etiqueta, com folga para as margens).
const LABELS_PER_PAGE = 4;

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8 },
  labelCell: {
    flexDirection: "row",
    height: 180,
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#1B3A66",
    borderStyle: "solid",
  },
  infoCol: { flex: 1, paddingRight: 10 },
  qrCol: { width: 90, alignItems: "center", justifyContent: "center" },
  qr: { width: 80, height: 80 },
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  pedido: { fontSize: 13, fontWeight: 700, color: "#1B3A66" },
  volume: { fontSize: 13, fontWeight: 700, color: "#229DCF" },
  destinatario: { fontSize: 9, fontWeight: 700, marginBottom: 2, color: "#000000" },
  linha: { fontSize: 8, marginBottom: 2, color: "#000000" },
  quantidadeBox: {
    alignSelf: "flex-start",
    marginBottom: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#1B3A66",
    borderStyle: "solid",
  },
  quantidadeTexto: { fontSize: 10, fontWeight: 700, color: "#1B3A66" },
  meta: { fontSize: 7, color: "#555555", marginBottom: 1 },
  codigo: { fontSize: 8, color: "#000000", marginTop: 2 },
  alerta: {
    marginTop: 3, padding: 3, fontSize: 6.5, fontWeight: 700, color: "#FFFFFF", backgroundColor: "#E63946",
  },
  observacoes: { marginTop: 3, fontSize: 7, color: "#000000" },
});

function agruparPorPagina<T>(itens: T[], porPagina: number): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina));
  return paginas;
}

export function EtiquetaPdfDocument({
  expedicao,
  numeroOS,
  clienteNome,
  quantidadeTotalPedido,
  divergente,
  qrDataUris,
}: {
  expedicao: ExpedicaoComVolumes;
  numeroOS: string;
  clienteNome: string;
  quantidadeTotalPedido: number;
  divergente: boolean;
  qrDataUris: string[];
}) {
  const totalVolumes = expedicao.volumes.length;
  const enderecoLinha = [
    [expedicao.endereco, expedicao.numero].filter(Boolean).join(", ") +
      (expedicao.complemento ? ` - ${expedicao.complemento}` : ""),
    [expedicao.bairro, expedicao.cidade, expedicao.uf].filter(Boolean).join(" - ") +
      (expedicao.cep ? ` - CEP ${expedicao.cep}` : ""),
  ]
    .filter((parte) => parte.trim().length > 0)
    .join(" — ");

  const etiquetas = expedicao.volumes.map((volume, i) => ({ volume, qr: qrDataUris[i] }));
  const paginas = agruparPorPagina(etiquetas, LABELS_PER_PAGE);

  return (
    <Document>
      {paginas.map((pagina, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pagina.map(({ volume, qr }) => (
            <View key={volume.id} style={styles.labelCell} wrap={false}>
              <View style={styles.infoCol}>
                <View style={styles.topRow}>
                  <Text style={styles.pedido}>PEDIDO: OS {numeroOS}</Text>
                  <Text style={styles.volume}>
                    VOLUME {volume.numero} DE {totalVolumes}
                  </Text>
                </View>
                <Text style={styles.destinatario}>DESTINATÁRIO: {clienteNome}</Text>
                {enderecoLinha && <Text style={styles.linha}>{enderecoLinha}</Text>}
                <Text style={styles.linha}>
                  PRODUTO: {volume.orcamentoItem?.descricao ?? "NÃO INFORMADO"}
                </Text>
                <View style={styles.quantidadeBox}>
                  <Text style={styles.quantidadeTexto}>
                    QUANTIDADE DESTE VOLUME: {volume.quantidade}
                  </Text>
                </View>
                <Text style={styles.meta}>QUANTIDADE TOTAL DO PEDIDO: {quantidadeTotalPedido}</Text>
                <Text style={styles.meta}>NOTA FISCAL: {expedicao.notaFiscal ?? "NÃO INFORMADA"}</Text>
                <Text style={styles.codigo}>{volume.codigoInterno}</Text>
                {divergente && (
                  <Text style={styles.alerta}>
                    ATENÇÃO: A SOMA DOS VOLUMES NÃO CONFERE COM A QUANTIDADE TOTAL DO PEDIDO
                  </Text>
                )}
                {expedicao.observacoes && (
                  <Text style={styles.observacoes}>OBSERVAÇÕES: {expedicao.observacoes}</Text>
                )}
              </View>
              <View style={styles.qrCol}>
                <Image style={styles.qr} src={qr} />
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
