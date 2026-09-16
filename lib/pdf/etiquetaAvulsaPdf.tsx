import { Document, Page, Text, Image, StyleSheet } from "@react-pdf/renderer";

// Label page size ~10x15cm (1cm ≈ 28.35pt): 283x425pt
const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 10 },
  descricao: { fontSize: 14, marginBottom: 12, color: "#1B3A66" },
  codigo: { fontSize: 10, marginBottom: 8, color: "#000000" },
  qr: { width: 100, height: 100 },
});

export function EtiquetaAvulsaPdfDocument({
  descricao,
  codigos,
  qrDataUris,
}: {
  descricao: string;
  codigos: string[];
  qrDataUris: string[];
}) {
  return (
    <Document>
      {codigos.map((codigo, i) => (
        <Page key={codigo} size={{ width: 283, height: 425 }} style={styles.page}>
          <Text style={styles.descricao}>{descricao}</Text>
          <Text style={styles.codigo}>{codigo}</Text>
          <Image style={styles.qr} src={qrDataUris[i]} />
        </Page>
      ))}
    </Document>
  );
}
