import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { OrcamentoComItens } from "@/lib/services/orcamentoService";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  header: { fontSize: 16, marginBottom: 4, color: "#1B3A66" },
  subheader: { fontSize: 10, marginBottom: 16, color: "#555555" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#1B3A66", paddingBottom: 4, fontSize: 9, color: "#1B3A66" },
  colDescricao: { flex: 3 },
  colTiragem: { flex: 1, textAlign: "right" },
  colPreco: { flex: 1, textAlign: "right" },
  total: { marginTop: 16, textAlign: "right", fontSize: 12, color: "#1B3A66" },
});

export function OrcamentoPdfDocument({ orcamento }: { orcamento: OrcamentoComItens }) {
  const total = orcamento.itens.reduce((soma, item) => soma + item.precoFinal, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Orçamento {orcamento.numero}</Text>
        <Text style={styles.subheader}>
          Cliente: {orcamento.cliente.nome} — Válido por {orcamento.validadeDias} dias
        </Text>

        <View style={styles.headerRow}>
          <Text style={styles.colDescricao}>Item</Text>
          <Text style={styles.colTiragem}>Tiragem</Text>
          <Text style={styles.colPreco}>Preço</Text>
        </View>

        {orcamento.itens.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colDescricao}>{item.descricao}</Text>
            <Text style={styles.colTiragem}>{item.tiragem}</Text>
            <Text style={styles.colPreco}>R$ {item.precoFinal.toFixed(2)}</Text>
          </View>
        ))}

        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>

        {orcamento.observacoes && (
          <Text style={{ marginTop: 16, fontSize: 9, color: "#555555" }}>
            Observações: {orcamento.observacoes}
          </Text>
        )}
      </Page>
    </Document>
  );
}
