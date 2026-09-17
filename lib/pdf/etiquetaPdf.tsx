import { Document, Page, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ExpedicaoComVolumes } from "@/lib/services/expedicaoService";

// Label page size ~10x15cm (1cm ≈ 28.35pt): 283x425pt
const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 10 },
  pedido: { fontSize: 16, fontWeight: 700, marginBottom: 2, color: "#1B3A66" },
  subheader: { fontSize: 9, marginBottom: 8, color: "#555555" },
  endereco: { fontSize: 9, marginBottom: 10, color: "#000000" },
  produto: { fontSize: 11, marginBottom: 10, color: "#000000" },
  volumeBox: { marginBottom: 10 },
  volume: { fontSize: 20, fontWeight: 700, color: "#229DCF" },
  quantidadeBox: {
    marginBottom: 10, padding: 6, borderWidth: 1, borderColor: "#1B3A66", borderStyle: "solid",
  },
  quantidadeDestaque: { fontSize: 14, fontWeight: 700, color: "#1B3A66" },
  quantidadeTotal: { fontSize: 9, marginBottom: 4, color: "#555555" },
  notaFiscal: { fontSize: 9, marginBottom: 10, color: "#555555" },
  codigo: { fontSize: 10, marginBottom: 8, color: "#000000" },
  qr: { width: 90, height: 90 },
  alerta: {
    marginTop: 10, padding: 6, fontSize: 9, fontWeight: 700, color: "#FFFFFF", backgroundColor: "#E63946",
  },
  observacoes: {
    marginTop: 10, padding: 6, fontSize: 8, color: "#000000", borderWidth: 1, borderColor: "#dddddd", borderStyle: "solid",
  },
});

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

  return (
    <Document>
      {expedicao.volumes.map((volume, i) => (
        <Page key={volume.id} size={{ width: 283, height: 425 }} style={styles.page}>
          <Text style={styles.pedido}>PEDIDO: OS {numeroOS}</Text>
          <Text style={styles.subheader}>DESTINATÁRIO: {clienteNome}</Text>
          <Text style={styles.endereco}>
            {[expedicao.endereco, expedicao.numero].filter(Boolean).join(", ")}
            {expedicao.complemento ? ` - ${expedicao.complemento}` : ""}
            {"\n"}
            {[expedicao.bairro, expedicao.cidade, expedicao.uf].filter(Boolean).join(" - ")}
            {expedicao.cep ? ` - CEP ${expedicao.cep}` : ""}
          </Text>
          <Text style={styles.produto}>
            PRODUTO: {volume.orcamentoItem?.descricao ?? "NÃO INFORMADO"}
          </Text>
          <Text style={{ ...styles.volume, ...styles.volumeBox }}>
            VOLUME {volume.numero} DE {totalVolumes}
          </Text>
          <Text style={{ ...styles.quantidadeDestaque, ...styles.quantidadeBox }}>
            QUANTIDADE DESTE VOLUME: {volume.quantidade}
          </Text>
          <Text style={styles.quantidadeTotal}>
            QUANTIDADE TOTAL DO PEDIDO: {quantidadeTotalPedido}
          </Text>
          <Text style={styles.notaFiscal}>
            NOTA FISCAL: {expedicao.notaFiscal ?? "NÃO INFORMADA"}
          </Text>
          <Text style={styles.codigo}>{volume.codigoInterno}</Text>
          <Image style={styles.qr} src={qrDataUris[i]} />
          {divergente && (
            <Text style={styles.alerta}>
              ATENÇÃO: A SOMA DOS VOLUMES NÃO CONFERE COM A QUANTIDADE TOTAL DO PEDIDO
            </Text>
          )}
          {expedicao.observacoes && (
            <Text style={styles.observacoes}>OBSERVAÇÕES: {expedicao.observacoes}</Text>
          )}
        </Page>
      ))}
    </Document>
  );
}
