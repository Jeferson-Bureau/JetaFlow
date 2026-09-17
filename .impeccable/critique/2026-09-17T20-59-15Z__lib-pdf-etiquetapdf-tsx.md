---
target: etiquetas (lib/pdf/etiquetaPdf.tsx e lib/pdf/etiquetaAvulsaPdf.tsx)
total_score: 15
max_score: 28
na_heuristics: 3,7,10
p0_count: 1
p1_count: 2
target_identity: "file:D:\\JETAPRINT\\JetaFlow\\lib\\pdf\\etiquetaPdf.tsx"
target_fingerprint: "sha256:dd6049de155b964c2991bd86b5c6e102af7392a4b8a3203e24a6c6a1baee89b9"
target_path: "D:\\JETAPRINT\\JetaFlow\\lib\\pdf\\etiquetaPdf.tsx"
timestamp: 2026-09-17T20-59-15Z
slug: lib-pdf-etiquetapdf-tsx
---
Method: dual-agent (A: a2483411c5a1cd7eb · B: a856b9e799cde245d)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Estados de "falta de dado" (NÃO INFORMADO/NÃO INFORMADA) têm o mesmo peso visual de dados reais; a etiqueta avulsa hoje nem comunica um estado coerente — sai da impressora ilegível. |
| 2 | Match System / Real World | 3/4 | `etiquetaPdf.tsx` lê como etiqueta de expedição real; `etiquetaAvulsaPdf.tsx` lê como ficha de arquivo genérica, sem QR, sem relação com o fluxo físico. |
| 3 | User Control and Freedom | n/a | PDF estático de uma via — não existe conceito de desfazer numa página impressa. |
| 4 | Consistency and Standards | 1/4 | As duas etiquetas só compartilham o nome da empresa: estrutura, raio de borda (2-3px vs 0px), paleta de cinzas (zero tons reaproveitados) e cor de alerta divergem. |
| 5 | Error Prevention | 2/4 | Código duplicado como texto (perto de "NOTA FISCAL" e sob o QR) é um bom fallback; mas nada distingue visualmente o volume 1 do volume 4 de uma mesma OS além do numeral pequeno na barra lateral. |
| 6 | Recognition Rather Than Recall | 3/4 | Rótulos em caixa-alta + código redundante ajudam; a avulsa perde pontos por não ter nenhum alvo de leitura por scanner. |
| 7 | Flexibility and Efficiency | n/a | Não existe modo "usuário experiente" para um template de impressão fixo. |
| 8 | Aesthetic and Minimalist Design | 2/4 | `etiquetaPdf.tsx` é limpo; `etiquetaAvulsaPdf.tsx` tem metade da célula vazia e, como renderiza hoje, está quebrada, não minimalista. |
| 9 | Error Recovery | 2/4 | Mensagem de divergência é clara mas não sugere ação, e derruba os acentos ("NAO CONFERE") enquanto o resto do texto mantém acentuação. |
| 10 | Help and Documentation | n/a | Ausência de ajuda em uma etiqueta física é correta, não é defeito. |
| **Total** | | **15/28** | **Aceitável (~54%)** |

## Design Specificity Verdict

**Avaliação de design (LLM):** `etiquetaPdf.tsx` foi genuinamente pensado para este fluxo — o "VOLUME 1 de 4" em 30pt dominando a barra lateral é exatamente o que alguém organizando uma pilha de caixas precisa ver primeiro, e o par "qtd. deste volume vs. qtd. total do pedido" só faz sentido para quem entende que pedidos de gráfica saem fracionados. `etiquetaAvulsaPdf.tsx` é o oposto: um cartão de índice genérico (nome da empresa, tag, descrição, código, data, rodapé com URL) que serviria para qualquer inventário de pequena empresa — sem QR, sem vínculo com o processo de conferência que a etiqueta "irmã" acabou de ganhar em dois ciclos de redesign reais.

**Varredura determinística:** o `impeccable detect` rodou sem erro sobre os dois `.tsx` e retornou 22 achados, todos `advisory`/`design-system-color` (cor fora do `DESIGN.md`). A maior parte é ruído — o `DESIGN.md` documenta a paleta da web app, não a paleta de neutros específica de um artefato de impressão em pontos via `@react-pdf/renderer` — mas um achado é substantivo: `#E63946` no alerta de divergência não é a `rosa #E23D7D` que o próprio `DESIGN.md` define como cor de perigo, e essa é a única cor de alerta que a etiqueta usa. O detector não tem nenhum modelo do layout flex do react-pdf/Yoga — por isso não viu o bug estrutural mais grave (abaixo), que só apareceu ao ler os PDFs renderizados pixel a pixel.

**Evidência visual:** não existe navegador/URL para este alvo — é um PDF impresso, não uma página web. O canal de evidência visual real foi renderizar os três PDFs de amostra e lê-los diretamente (não apenas extrair texto): foi assim, e não pelo detector, que o bug de layout abaixo foi confirmado por ambas as avaliações, independentemente.

## Overall Impression

A etiqueta principal (`etiquetaPdf.tsx`) é um redesign bem-sucedido e específico do domínio — o volume grande, o QR redundante como texto, os fallbacks em português real em vez de "N/A" são acertos genuínos. Mas a etiqueta avulsa (`etiquetaAvulsaPdf.tsx`) está estruturalmente quebrada em produção agora mesmo, e a etiqueta principal tem um problema sistemático de contraste/tamanho exatamente nos textos que servem para desambiguar os dois números grandes ou como fallback de leitura — o pior lugar possível para isso.

## What's Working

- **Numeral de volume gigante (30pt) na barra lateral navy**: a decisão de hierarquia certa — o que alguém triando uma pilha de caixas precisa ver primeiro, maior que o QR, maior que o nome do destinatário.
- **Código duplicado como texto** perto de "NOTA FISCAL" e sob o QR: fallback de impressão inteligente — se o QR falhar (dobra, mancha, luz ruim), o operador digita o código sem precisar procurar, exatamente onde os olhos já estariam após uma leitura falha.
- **Fallbacks em português real** ("NÃO INFORMADO"/"NÃO INFORMADA") em vez de "N/A" ou traço — consistente com o mesmo padrão já usado na tela de conferência (`ConferenciaClient.tsx`), o que é uma vitória de consistência entre PDF e web provavelmente acidental, mas vale tornar deliberada.

## Priority Issues

**[P0] `etiquetaAvulsaPdf.tsx` renderiza com texto sobreposto e ilegível em produção**
- **Why it matters:** No PDF renderizado, "Caixa organizadora reforçada 40x30x25cm" sobrepõe literalmente "CÓDIGO INTERNO: EA00007-0X" e "Emitido em: ...", e "JETAPRINT" sobrepõe a tag "ETIQUETA AVULSA" (cortada para "AVULS"). Toda etiqueta avulsa impressa hoje sai ilegível.
- **Causa raiz confirmada (por ambas as avaliações, independentemente):** `styles.infoCol` é definido em `lib/pdf/etiquetaAvulsaPdf.tsx:22` mas nunca aplicado no JSX. `labelCell` é `flexDirection: "row"` (linha 12), e `topRow`, `descricao`, `codigoLabel`, `codigo`, `meta` e `footerRow` são todos filhos diretos desse container em linha — sem largura explícita, o Yoga (motor de layout do react-pdf) os posiciona lado a lado em vez de empilhados, produzindo a sobreposição observada.
- **Fix:** envolver os filhos de `labelCell` (de `topRow` a `footerRow`) em `flexDirection: "column"` — seja aplicando `styles.infoCol` corrigido, seja mudando `labelCell` para coluna, já que este template não tem uma segunda coluna (sem QR, sem barra lateral).
- **Suggested command:** `/impeccable harden` (bug de produção, não uma questão de gosto) — ou correção direta antes de qualquer polimento visual.

**[P1] A única cor de alerta e vários textos de apoio quebram o padrão de cor da marca e falham em contraste, exatamente onde mais importa**
- **Why it matters:** O banner de divergência usa `#E63946`, não a `rosa #E23D7D` que o `DESIGN.md` define como a cor de perigo do produto — a única cor de alerta da etiqueta inventa um terceiro vermelho. Além disso, medindo contraste WCAG real: o código sob o QR e o `qrLabel` (fallback de leitura quando o scan falha) usam `#AAAAAA` sobre branco — **2.32:1**, muito abaixo do mínimo de 4.5:1 para texto pequeno; as tags "OS"/"ETIQUETA AVULSA" em branco sobre ciano `#229DCF` ficam em **3.09:1**; rótulos como "DESTINATÁRIO"/"PRODUTO" em `#888888` sobre branco ficam em **3.55:1**. O mesmo padrão se repete 4 vezes entre os dois arquivos — não é um erro pontual.
- **Fix:** trocar `alerta.backgroundColor` para `#E23D7D` (o token de perigo já estabelecido); escurecer os cinzas de rótulo/fallback (`#888888`→algo ≥`#5B5B5B`, `#AAAAAA`→algo ≥`#6B6B6B`) até atingir 4.5:1 sobre seus fundos, com atenção redobrada ao texto que serve de fallback de leitura (é o texto mais importante justamente quando o QR falha).
- **Suggested command:** `/impeccable colorize` ou `/impeccable audit` (contraste é um item de auditoria técnica clássico).

**[P1] O texto operacionalmente mais importante do rótulo (observação de entrega) é o menos visível e pode ser cortado silenciosamente**
- **Why it matters:** No cenário de divergência, a observação ("Entregar somente no período da manhã...") renderiza em 6.5pt cinza simples, *depois* do banner vermelho de largura total — a atenção do operador para no banner e a instrução de entrega, potencialmente mais crítica para o sucesso da remessa do que uma divergência interna de quantidade, fica em segundo plano. Tecnicamente, `labelCell` tem altura fixa (185pt) e `overflow: "hidden"` (confirmado no código), e o campo de observações no formulário (`ExpedicaoForm.tsx`) é um `<textarea>` livre sem `maxLength` — uma observação real mais longa, combinada com divergência e um produto/endereço que quebre em 2 linhas, pode ultrapassar os 185pt e ser cortada sem nenhum indicador visual (nem "...", nem aviso).
- **Fix:** dar à observação um contêiner próprio (ex.: caixa com o amarelo de "atenção intermediária" da marca) em vez de texto solto após o alerta, e trocar `overflow: "hidden"` por uma altura mínima que cresça com o conteúdo (ou truncar visivelmente com reticências) em vez de cortar silenciosamente.
- **Suggested command:** `/impeccable harden` (é uma lacuna de dados sem guarda, não só estética).

**[P2] Nenhum sistema visual compartilhado entre as duas etiquetas — a avulsa não tem caminho de leitura/conferência algum**
- **Why it matters:** Além do bug e da cor de alerta, os dois templates não compartilham raio de borda (2-3px vs. 0px — nenhum dos dois bate exatamente com a regra de 4px/8px do `DESIGN.md` da web, mas divergem também entre si), nem uma única cor de cinza (8 tons em `etiquetaPdf.tsx`, 4 tons totalmente diferentes em `etiquetaAvulsaPdf.tsx`, zero sobreposição). Mais grave operacionalmente: itens avulsos — que não têm rastro de OS — não têm QR nem código lido por scanner, então não está claro se passam pela mesma conferência de expedição ou por um processo manual à parte; nada na etiqueta comunica isso.
- **Fix:** definir uma paleta de neutros e um raio de borda únicos para os dois templates (um "print token set" próprio, já que o `DESIGN.md` da web não cobre este artefato), e decidir deliberadamente se etiquetas avulsas precisam de QR/código escaneável.
- **Suggested command:** `/impeccable document` (formalizar um sistema de tokens próprio para o artefato impresso) seguido de `/impeccable layout`.

**[P3] Polimento menor: acentuação, tinta desperdiçada, URL de marketing num documento interno**
- **Why it matters:** o texto de alerta derruba os acentos ("NAO CONFERE") enquanto todo o resto do rótulo mantém acentuação — parece artefato de copiar/colar, não escolha deliberada, bem no elemento que mais tenta parecer sério. O fundo `#F5F7FA` da página em `etiquetaPdf.tsx` imprime um cinza-azulado ao redor de cada cartão branco que nunca sobrevive ao corte das etiquetas — desperdício de tinta/toner em impressora de escritório comum. O rodapé "jetaprint.com.br" na etiqueta avulsa é uma URL de marketing num documento interno que viaja dentro de uma caixa — questionável frente a, por exemplo, um contato interno.
- **Fix:** corrigir a acentuação; trocar o fundo da página para branco puro; reavaliar se a URL pertence ali.
- **Suggested command:** `/impeccable polish`.

## Persona Red Flags

**Operador de expedição (Alex/Riley combinados)** — escaneando 40 etiquetas nos últimos 20 minutos antes do caminhão sair, luz de canto de galpão: pega uma pilha de 4 etiquetas da mesma OS — todas idênticas exceto o numeral pequeno na barra lateral, sem nenhuma pista secundária (faixa de cor, marca de canto) para evitar colar a etiqueta errada na caixa errada sob pressa. Se o QR falhar no primeiro scan (sombra do dedo, brilho no fundo levemente colorido do cartão), cai para o código em texto — que funciona, mas está em `#AAAAAA` (2.32:1 de contraste), ou seja, o fallback para quando a leitura já falhou é *menos* legível que o próprio QR, não mais.

**Testador de edge cases (Riley)** — carrega uma OS divergente com observação longa e sem nota fiscal: confirma que, nesta amostra específica, nada corta visivelmente — mas não há mecanismo de truncamento visível no código (`overflow: "hidden"` corta silenciosamente), então uma observação real mais longa correria risco real, sem nenhum sinal de que falta texto. Também nota a acentuação derrubada só no texto de alerta.

**Funcionário novo/temporário imprimindo uma etiqueta avulsa** — hoje recebe uma página com texto sobreposto ilegível. Mesmo corrigido o bug, essa etiqueta não tem QR/código escaneável — nada nela diz se o item avulso passa pela mesma conferência de expedição ou por um processo manual à parte, exatamente o tipo de ambiguidade que um funcionário novo adivinharia errado.

## Minor Observations

- Dimensão física real calculada a partir do stylesheet: cada etiqueta de `etiquetaPdf.tsx` ocupa ≈19,9cm × 6,5cm (tira horizontal larga, não 10×15cm) — consistente com o commit "formato horizontal, 4 por folha A4"; a avulsa calcula ≈19,6cm × 6,35cm, quase idêntica em footprint físico apesar do layout totalmente diferente.
- O QR de 72×72pt (react-pdf usa pontos = 1/72") equivale a 2,54cm × 2,54cm — tamanho fisicamente razoável para leitura por câmera de celular a curta distância, dado que a fonte da imagem do QR tenha resolução/contraste adequados na impressão.
- Raio de borda: `etiquetaPdf.tsx` usa 2-3px, `etiquetaAvulsaPdf.tsx` usa 0px — nenhum dos dois bate exatamente com a regra de 4px/8px do `DESIGN.md` da web (esperado, é um artefato de impressão separado, mas vale um token próprio documentado).
- Os 22 achados do detector determinístico são, em sua maioria, ruído: comparam cores de um artefato impresso com o `DESIGN.md` da web, que nunca pretendeu cobrir a paleta de neutros específica do PDF. O único achado substantivo é o vermelho de alerta fora do token de perigo da marca (já listado como P1 acima).
- A construção "tag + contador" da etiqueta avulsa ("ETIQUETA AVULSA" + "1 de 4") ecoa bem o "osTag"/"osNumero" da etiqueta principal em conceito — uma vez corrigido o bug de layout, essa parte específica vale preservar.

## Questions to Consider

1. A etiqueta mais nova (com QR, redesenhada duas vezes) recebeu todo o investimento, enquanto a avulsa — usada para itens que, por não terem OS, arguivelmente têm *mais* risco de se perder ou ser trocados — não tem nenhum caminho de leitura por scanner. Isso é intencional (avulsa é realmente menor risco) ou só ficou para trás por acaso?
2. O banner de divergência avisa o operador do chão de fábrica que algo está errado na matemática do pedido, mas não dá nenhuma ação — faz sentido esse alerta aparecer só na etiqueta impressa, ou "divergente" deveria travar a geração da etiqueta no nível ADMIN antes de chegar a esse ponto?
3. Alguém já testou uma impressão real em lote na impressora de etiqueta da própria gráfica, e escaneou com o leitor/celular real usado na expedição? Vários riscos aqui (contraste de 2.32:1, legendas de 5.5pt, fundo colorido desperdiçando tinta) só aparecem sob papel/toner/luz reais, não numa tela.
