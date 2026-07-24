# MOODBOARD — Refinamento da Estética da Biblioteca de Gosto
> Funil do método Chase AI (7FU98OJLHs), Passo 3. As 5 escolhas são SUAS.
> Âncora: referências tech/fin REAIS capturadas em `taste-library/shots/` (não suposto).
> Regra anti-slop Vitrine Certa: cada nicho mantém cor/fonte/mecânica únicas (DESIGN.md v3).

## Âncoras reais usadas (prints em taste-library/shots/)
- `tech-06` aino.agency — brutalismo de terminal, mono, B&W, ASCII art, assimetria de menu.
- `fin-04` ai-in-banking — nocturne tech, display gigante, gradiente índigo profundo, glow suave.
- `tech-04` 4wide.jp — swiss minimal; `fin-03` ab.finance — editorial serif; `tech-05` acova.ai — print tech paper.

---

# BLOCO A — 5 variações com skill ANTI-AI-SLOP (Hallmark: estrutura > cor)
> Cada uma = 1 macroestrutura Hallmark + tokens. O "slop tell" que mata é estrutura repetida, não cor.

## A1 — Split Studio (15) · "Diptych Editorial"
- **aesthetic:** Diptych texto/prova alternando verticalmente. Lado esquerdo = metadados do card (estilo, premiação, keywords), lado direito = print. Quebra o grid de cards centralizados.
- **reference:** `tech-05` acova.ai (print tech paper) + `fin-03` ab.finance (editorial serif).
- **intent:** Curadoria de gosto por nicho; ação = copiar image_prompt/brief.
- **guardrails:** nunca hero centralizado→3 cards iguais; nunca gradiente roxo; nunca Inter (usa mono pra labels, serif pra títulos).
- **tokens:** --bg:#0E0E13 --fg:#E8E8EE --a1:#C6FF00 --mono:JetBrains Mono --serif:Instrument Serif.

## A2 — Bento Grid (01) · "Painel Irregular"
- **aesthetic:** Grid bento assimétrico — cards de tamanhos variados (alguns ocupam 2 colunas). Filtros viram "painel" fixo à esquerda, não barra topo.
- **reference:** `tech-04` 4wide.jp (swiss/minimal) + `fin-04` ai-in-banking (bloco de stats gigante).
- **intent:** Varredura rápida de muitos sites premiados por nicho.
- **guardrails:** nunca 3 colunas iguais; nunca footer de 4 colunas; nunca card com borda-colorida-esquerda.
- **tokens:** --bg:#0B0B0F --fg:#EDEDF2 --a1:#7C5CFF --a2:#D9F03A --sans:Space Grotesk.

## A3 — Workbench (05) · "Terminal de Curadoria"
- **aesthetic:** Vibe IDE/terminal. Sidebar esquerda = árvore de nichos/estilos (tipo explorer), área principal = "abas" de cards. Mono em tudo. ASCII como divisor.
- **reference:** `tech-06` aino.agency (brutalismo terminal, ASCII, mono B&W).
- **intent:** Sentir que a biblioteca É uma ferramenta (como o app do vídeo).
- **guardrails:** nunca Inter; nunca fotos decorativas sem função; nunca gradiente.
- **tokens:** --bg:#0A0A0A --fg:#E6E6E6 --a1:#00FF9C --mono:IBM Plex Mono --bw:puro.

## A4 — Stat-Led (04) · "Curadoria por Número"
- **aesthetic:** Cada nicho abre com 1 número gigante (ex: "284 sites · 10 nichos") e os cards em lista densa. Hero com display pesado cortado na borda (como o "10" do fin-04).
- **reference:** `fin-04` ai-in-banking (display gigante, glow) + `tech-09` ashwingupta (dev portfolio).
- **intent:** Mostrar escala da curadoria (prova de gosto acumulado).
- **guardrails:** nunca gradiente roxo; glow sutil só em 1 acento; nunca Inter.
- **tokens:** --bg:#0D0B14 --fg:#F2EEFF --a1:#A78BFA --a2:#C8743C --display:Fraunces.

## A5 — Index-First (13) · "Catálogo Tipográfico"
- **aesthetic:** Tipografia como herói. Lista-index de nichos/estilos em tipo grande com hover-reveal do print. Quase sem chrome de UI.
- **reference:** `tech-05` acova.ai (print tech paper) + `fin-03` ab.finance (editorial).
- **intent:** Navegação por "índice de gosto" — leve, tipográfica.
- **guardrails:** nunca 3 cards; nunca CTA pill genérico; nunca Inter.
- **tokens:** --bg:#10100C --fg:#F4F1E8 --a1:#E5443B --serif:Instrument Serif --mono:JetBrains Mono.

---

# BLOCO B — 5 variações com pipeline do VÍDEO (Taste/Impeccable + Higgsfield + 21st.dev)
> Equivalente livre (NIM free não gera imagem; usamos Gemini Flash p/ hero):
> Taste/Impeccable = anti-slop + polish; Higgsfield = hero imagery nativa; 21st.dev = componentes.

## B1 — "Vast Quiet Cinematic" (família do próprio Chase)
- **aesthetic:** Hero monumental com imagem nativa (Higgsfield/Gemini), muito respiro, serifada display. Cards flutuam sobre a imagem com blur sutil.
- **reference:** `fin-04` ai-in-banking (nocturne, glow) traduzida pra biblioteca.
- **intent:** A biblioteca "parece um filme de design", não um spreadsheet.
- **guardrails:** nunca Inter; nunca gradiente roxo; hero = imagem real gerada, não blob 3D.
- **tokens:** --bg:#0E0E13 --fg:#EDEDF2 --a1:#C6FF00 --serif:Instrument Serif --hero:img Gemini.

## B2 — "Print Tech Paper" (família do vídeo)
- **aesthetic:** Textura de papel/kraft, grão, tipografia com caráter (serif display + mono). Cards com borda fina e sombra de papel.
- **reference:** `tech-05` acova.ai (print tech paper) + `padaria` Wildwood (ilustração autoral).
- **intent:** Curadoria "tangível", artesanal, quente.
- **guardrails:** nunca gradiente; nunca Inter; grão sutil (não ruído).
- **tokens:** --bg:#F4F1E8 --fg:#1A1A1A --a1:#E5443B --serif:Fraunces --mono:JetBrains Mono.

## B3 — "Dither Mono" (família do vídeo)
- **aesthetic:** Monocromático com dithering (retícula), mono stricto, alto contraste. Hero com padrão dither. Cards em greyscale com 1 acento.
- **reference:** `tech-06` aino.agency (B&W terminal) + `tech-04` 4wide (swiss).
- **intent:** Estética "técnica/gerativa" coerente com o público tech.
- **guardrails:** nunca cor quente; nunca Inter; dither controlado.
- **tokens:** --bg:#0A0A0A --fg:#E6E6E6 --a1:#00FF9C --mono:IBM Plex Mono.

## B4 — "Swiss Minimal" (família do vídeo + 21st.dev)
- **aesthetic:** Grid rigoroso, muito espaço negativo, tipografia neutra espaçada. Componentes copiados do 21st.dev (botões/cards limpos).
- **reference:** `tech-04` 4wide.jp + `fin-07` theartoffinance (swiss).
- **intent:** Clareza máxima, "design system" da curadoria.
- **guardrails:** nunca ornamento; nunca gradiente; tipografia espaçada (não Inter — usa Space Grotesk).
- **tokens:** --bg:#FFFFFF --fg:#111 --a1:#111 --sans:Space Grotesk --line:#E5E5E5.

## B5 — "Editorial Serif" (família do vídeo)
- **aesthetic:** Revista de design. Títulos serifados grandes, layout de página (colunas), imagens em moldura. Sentimento de "publicação de gosto".
- **reference:** `fin-03` ab.finance + `tech-05` acova.ai (editorial).
- **intent:** A biblioteca como "revista curada" por nicho.
- **guardrails:** nunca Inter; nunca 3 cards; nunca gradiente roxo.
- **tokens:** --bg:#0F0E0C --fg:#F2EFE6 --a1:#C8743C --serif:Fraunces --mono:JetBrains Mono.

---

## Como escolher (funil do vídeo)
1. Você escolhe **1 das 10** (A1–A5 ou B1–B5).
2. Eu gero **3 refinamentos** dessa (variações de token/intensidade).
3. Você escolhe o melhor → aplico na `taste-library/index.html` + registro em `_brief.json`.

**Suas 5 escolhas são as do vídeo: não one-shot, você dirige o gosto.**
