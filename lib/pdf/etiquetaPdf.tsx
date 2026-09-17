import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ExpedicaoComVolumes } from "@/lib/services/expedicaoService";

// Folha A4 retrato, 4 etiquetas horizontais empilhadas por página
// (842pt de altura útil ÷ 4 ≈ 180pt por etiqueta, com folga para as margens).
const LABELS_PER_PAGE = 4;

const styles = StyleSheet.create({
  page: { padding: 16, fontSize: 8, backgroundColor: "#F5F7FA" },

  // ── Célula principal ──────────────────────────────────────────────────────
  labelCell: {
    flexDirection: "row",
    height: 185,
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0D8E8",
    borderStyle: "solid",
  },

  // ── Faixa lateral esquerda (identidade + volume) ──────────────────────────
  sideBar: {
    width: 58,
    backgroundColor: "#1B3A66",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  empresaSide: { fontSize: 6, fontWeight: 700, color: "#FFFFFF", textAlign: "center" },
  volumeBlock: { alignItems: "center" },
  // #A8C4E0 (não o ciano da marca) para manter contraste ≥4.5:1 sobre o navy do sideBar.
  volumeLabel: { fontSize: 6, color: "#A8C4E0", fontWeight: 700, marginBottom: 2 },
  volumeNumero: { fontSize: 30, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 },
  volumeDe: { fontSize: 6.5, color: "#A8C4E0", marginTop: 2 },
  volumeTotal: { fontSize: 13, fontWeight: 700, color: "#A8C4E0" },
  // #1C7FA8: ciano escurecido só para esta etiqueta em texto branco pequeno —
  // o ciano de marca (#229DCF) fica em ~3.1:1 de contraste com branco, abaixo do 4.5:1 mínimo.
  osTag: {
    backgroundColor: "#1C7FA8",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 2,
    width: "100%",
  },
  osTagText: { fontSize: 6, fontWeight: 700, color: "#FFFFFF", textAlign: "center" },
  osNumero: { fontSize: 9, fontWeight: 700, color: "#FFFFFF", textAlign: "center", marginTop: 2 },

  // ── Área de conteúdo central ───────────────────────────────────────────────
  contentArea: { flex: 1, flexDirection: "column", padding: 10 },

  destinatarioLabel: { fontSize: 6, color: "#6B7280", fontWeight: 700, marginBottom: 1 },
  destinatarioNome: { fontSize: 11, fontWeight: 700, color: "#0D1F3C", marginBottom: 2 },
  enderecoText: { fontSize: 7.5, color: "#444444", marginBottom: 5 },

  produtoLabel: { fontSize: 6, color: "#6B7280", fontWeight: 700, marginBottom: 1 },
  produtoText: { fontSize: 8, color: "#222222", marginBottom: 5 },

  divider: { height: 1, backgroundColor: "#E8ECF2", marginBottom: 6 },

  // ── Linha de quantidades em destaque ─────────────────────────────────────
  quantRow: { flexDirection: "row", gap: 8, marginBottom: 6 },

  qtdVolumeBox: {
    flex: 1,
    backgroundColor: "#1B3A66",
    borderRadius: 3,
    padding: 6,
    alignItems: "center",
  },
  qtdVolumeLabel: { fontSize: 5.5, color: "#A8C4E0", fontWeight: 700, marginBottom: 2 },
  qtdVolumeNumero: { fontSize: 22, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 },
  qtdVolumeUnidade: { fontSize: 6, color: "#A8C4E0", marginTop: 2 },

  qtdTotalBox: {
    flex: 1,
    backgroundColor: "#EEF2F8",
    borderRadius: 3,
    padding: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D8E8",
    borderStyle: "solid",
  },
  qtdTotalLabel: { fontSize: 5.5, color: "#666666", fontWeight: 700, marginBottom: 2 },
  qtdTotalNumero: { fontSize: 22, fontWeight: 700, color: "#1B3A66", lineHeight: 1 },
  qtdTotalUnidade: { fontSize: 6, color: "#666666", marginTop: 2 },

  // ── Linha inferior ────────────────────────────────────────────────────────
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  metaLabel: { fontSize: 5.5, color: "#6B7280", fontWeight: 700 },
  metaValue: { fontSize: 7.5, color: "#222222", fontWeight: 700 },
  codigoText: { fontSize: 6, color: "#6B7280" },

  // #C22D6B: rosa de marca escurecido — a rosa #E23D7D dá só ~4.0:1 com texto
  // branco pequeno, abaixo do 4.5:1 mínimo; esta versão mais escura mantém a
  // família de cor (rosa = perigo) e passa em ~5.4:1.
  alerta: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: "#C22D6B",
    borderRadius: 2,
  },
  alertaText: { fontSize: 6, fontWeight: 700, color: "#FFFFFF" },
  observacoes: { marginTop: 3, fontSize: 6.5, color: "#333333" },

  // ── Coluna QR ─────────────────────────────────────────────────────────────
  qrCol: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#E8ECF2",
    borderLeftStyle: "solid",
    padding: 6,
  },
  qr: { width: 72, height: 72 },
  qrLabel: { fontSize: 5.5, color: "#6B7280", marginTop: 4, textAlign: "center" },
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

              {/* ── Faixa lateral: empresa + número do volume + OS ── */}
              <View style={styles.sideBar}>
                <Text style={styles.empresaSide}>JETA{"\n"}PRINT</Text>

                <View style={styles.volumeBlock}>
                  <Text style={styles.volumeLabel}>VOLUME</Text>
                  <Text style={styles.volumeNumero}>{volume.numero}</Text>
                  <Text style={styles.volumeDe}>de</Text>
                  <Text style={styles.volumeTotal}>{totalVolumes}</Text>
                </View>

                <View style={styles.osTag}>
                  <Text style={styles.osTagText}>OS</Text>
                  <Text style={styles.osNumero}>{numeroOS}</Text>
                </View>
              </View>

              {/* ── Conteúdo central ── */}
              <View style={styles.contentArea}>
                <Text style={styles.destinatarioLabel}>DESTINATÁRIO</Text>
                <Text style={styles.destinatarioNome}>{clienteNome}</Text>
                {enderecoLinha ? (
                  <Text style={styles.enderecoText}>{enderecoLinha}</Text>
                ) : null}

                <Text style={styles.produtoLabel}>PRODUTO</Text>
                <Text style={styles.produtoText}>
                  {volume.orcamentoItem?.descricao ?? "NÃO INFORMADO"}
                </Text>

                <View style={styles.divider} />

                {/* Quantidades em destaque */}
                <View style={styles.quantRow}>
                  <View style={styles.qtdVolumeBox}>
                    <Text style={styles.qtdVolumeLabel}>QTD. DESTE VOLUME</Text>
                    <Text style={styles.qtdVolumeNumero}>{volume.quantidade}</Text>
                    <Text style={styles.qtdVolumeUnidade}>unidades</Text>
                  </View>
                  <View style={styles.qtdTotalBox}>
                    <Text style={styles.qtdTotalLabel}>QTD. TOTAL DO PEDIDO</Text>
                    <Text style={styles.qtdTotalNumero}>{quantidadeTotalPedido}</Text>
                    <Text style={styles.qtdTotalUnidade}>unidades</Text>
                  </View>
                </View>

                {/* Rodapé: NF + código */}
                <View style={styles.bottomRow}>
                  <View>
                    <Text style={styles.metaLabel}>NOTA FISCAL</Text>
                    <Text style={styles.metaValue}>{expedicao.notaFiscal ?? "NÃO INFORMADA"}</Text>
                  </View>
                  <Text style={styles.codigoText}>{volume.codigoInterno}</Text>
                </View>

                {divergente && (
                  <View style={styles.alerta}>
                    <Text style={styles.alertaText}>
                      A SOMA DOS VOLUMES NÃO CONFERE COM A QUANTIDADE TOTAL DO PEDIDO
                    </Text>
                  </View>
                )}

                {expedicao.observacoes && (
                  <Text style={styles.observacoes}>OBS: {expedicao.observacoes}</Text>
                )}
              </View>

              {/* ── QR Code ── */}
              <View style={styles.qrCol}>
                <Image style={styles.qr} src={qr} />
                <Text style={styles.qrLabel}>{volume.codigoInterno}</Text>
              </View>

            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
