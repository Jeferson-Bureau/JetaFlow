import { Document, Page, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ExpedicaoComVolumes } from "@/lib/services/expedicaoService";

// Label page size ~10x15cm (1cm ≈ 28.35pt): 283x425pt
const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 10 },
  header: { fontSize: 14, marginBottom: 4, color: "#1B3A66" },
  subheader: { fontSize: 9, marginBottom: 8, color: "#555555" },
  endereco: { fontSize: 9, marginBottom: 12, color: "#000000" },
  volume: { fontSize: 12, marginBottom: 8, color: "#229DCF" },
  codigo: { fontSize: 10, marginBottom: 8, color: "#000000" },
  qr: { width: 100, height: 100 },
});

export function EtiquetaPdfDocument({
  expedicao,
  numeroOS,
  clienteNome,
  qrDataUris,
}: {
  expedicao: ExpedicaoComVolumes;
  numeroOS: string;
  clienteNome: string;
  qrDataUris: string[];
}) {
  return (
    <Document>
      {expedicao.volumes.map((volume, i) => (
        <Page key={volume.id} size={{ width: 283, height: 425 }} style={styles.page}>
          <Text style={styles.header}>OS {numeroOS}</Text>
          <Text style={styles.subheader}>{clienteNome}</Text>
          <Text style={styles.endereco}>
            {[expedicao.endereco, expedicao.numero].filter(Boolean).join(", ")}
            {expedicao.complemento ? ` - ${expedicao.complemento}` : ""}
            {"\n"}
            {[expedicao.bairro, expedicao.cidade, expedicao.uf].filter(Boolean).join(" - ")}
            {expedicao.cep ? ` - CEP ${expedicao.cep}` : ""}
          </Text>
          <Text style={styles.volume}>
            Volume {volume.numero} de {expedicao.totalVolumes}
          </Text>
          <Text style={styles.codigo}>{volume.codigoInterno}</Text>
          <Image style={styles.qr} src={qrDataUris[i]} />
        </Page>
      ))}
    </Document>
  );
}
