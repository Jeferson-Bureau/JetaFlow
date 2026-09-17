import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Folha A4 retrato, 4 etiquetas avulsas empilhadas por página
// (842pt de altura útil ÷ 4 ≈ 180pt por etiqueta, com folga para margens)
const LABELS_PER_PAGE = 4;

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8 },

  // Célula de cada etiqueta
  labelCell: {
    flexDirection: "column",
    height: 180,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1B3A66",
    borderStyle: "solid",
  },

  // Cabeçalho interno da etiqueta
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    borderBottomStyle: "solid",
  },
  empresa: { fontSize: 11, fontWeight: 700, color: "#1B3A66" },
  contadorWrap: { alignItems: "flex-end" },
  // #1C7FA8: ciano escurecido só aqui — o ciano de marca (#229DCF) fica em
  // ~3.1:1 de contraste com texto branco pequeno, abaixo do 4.5:1 mínimo.
  tipoTag: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: "#1C7FA8",
    marginBottom: 2,
  },
  tipoTagText: { fontSize: 6, fontWeight: 700, color: "#FFFFFF" },
  contador: { fontSize: 7, color: "#555555" },

  // Descrição
  descricao: { fontSize: 13, fontWeight: 700, color: "#1B3A66", marginBottom: 6 },

  // Código interno
  codigoLabel: { fontSize: 6.5, color: "#6B7280", marginBottom: 2 },
  codigo: { fontSize: 9, fontWeight: 700, color: "#000000", marginBottom: 4 },

  // Metadados
  meta: { fontSize: 7, color: "#555555", marginBottom: 2 },

  // Rodapé dentro da célula
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderTopStyle: "solid",
  },
  footerText: { fontSize: 6, color: "#6B7280" },


});

function agruparPorPagina<T>(itens: T[], porPagina: number): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina));
  return paginas;
}

export function EtiquetaAvulsaPdfDocument({
  descricao,
  codigos,
  emitidoEm,
}: {
  descricao: string;
  codigos: string[];
  emitidoEm?: string;
}) {
  const dataFormatada = emitidoEm
    ? new Date(emitidoEm).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const totalEtiquetas = codigos.length;
  const etiquetas = codigos.map((codigo, i) => ({ codigo, numero: i + 1 }));
  const paginas = agruparPorPagina(etiquetas, LABELS_PER_PAGE);

  return (
    <Document>
      {paginas.map((pagina, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pagina.map(({ codigo, numero }) => (
            <View key={codigo} style={styles.labelCell} wrap={false}>
              {/* Cabeçalho */}
              <View style={styles.topRow}>
                <Text style={styles.empresa}>JETAPRINT</Text>
                <View style={styles.contadorWrap}>
                  <View style={styles.tipoTag}>
                    <Text style={styles.tipoTagText}>ETIQUETA AVULSA</Text>
                  </View>
                  <Text style={styles.contador}>
                    {numero} de {totalEtiquetas}
                  </Text>
                </View>
              </View>

              {/* Descrição */}
              <Text style={styles.descricao}>{descricao}</Text>

              {/* Código */}
              <Text style={styles.codigoLabel}>CÓDIGO INTERNO:</Text>
              <Text style={styles.codigo}>{codigo}</Text>

              {/* Meta */}
              <Text style={styles.meta}>Emitido em: {dataFormatada}</Text>

              {/* Rodapé da célula */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>jetaprint.com.br</Text>
                <Text style={styles.footerText}>{codigo}</Text>
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
