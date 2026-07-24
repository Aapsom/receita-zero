# Plano — Refino Funcional da Biblioteca de Gosto (pós-B2-A)

Referência de código: `taste-library/index.html` (single-file, `load()`→`render()`→`card()`→`copy()`).
Gargalo atual do export: `image_prompt`/`brief` são STRINGS FIXAS em `data.json` (geradas por padrão no Python).
O vídeo (Passo 1) exige: cultivar gosto → "bring to AI as foundation". Hoje a lib MOSTRA/copia,
mas NÃO registra preferência nem COMPOE brief de projeto. É o buraco.

## 1) Favoritar + persistir (localStorage)
- Estado: `Set` de ids em `localStorage['tg_favs']` (JSON).
- Card: botão ⭐ (toggle) no canto do card. `card()` ganha `favBtn(i)`.
- Filtro "Só favoritos": checkbox na `.bar` → `match()` retorna `!favOnly || favs.has(i.id)`.
- Render respeita favoritos. Sobrevive reload.
- Custo: ~20 linhas JS. Sem quebrar lint.

## 2) Moodboard de projeto + export brief (Passo 1 → IA)
- "Selecionar p/ moodboard": cada card tem checkbox `□`. Seleção = `Set` em memória (ou localStorage).
- Barra inferior flutuante "Moodboard (N)" com botão **Gerar Brief**.
- `gerarBrief(selecionados)` monta os 4 PILARES DO VÍDEO a partir dos cards reais:
  - **aesthetic**: moda dos `estilo` + `vocabulario` dos selecionados.
  - **reference**: lista de "site real (url) — estilo — premiação" (o "match the FEEL, not copy").
  - **intent**: template "público-alvo + ação" preenchido com o nicho dominante dos selecionados.
  - **guardrails**: anti-slop do projeto (nunca Inter/gradiente roxo/blob 3D) + os `nicho_fit`.
- Abre modal com o brief composto + botão copiar. É o "bring to AI" literal.

## 3) Comparar side-by-side
- Mesmo `Set` de seleção de (2). Botão "Comparar" na barra flutuante abre modal com os prints dos selecionados
  lado a lado (1–3 colunas). Legenda: estilo/premiação de cada.
- Justificativa anti-ai-slop: "nunca julgue hex/estilo isolado" — ver junto = gosto, não achismo.

## 4) Similar por feeling
- De um card: botão "similares" → `score(i,j)` por (estilo igual +1, keywords em comum +0.3, nicho em comum +0.2).
- Ordena e mostra top 5 como mini-lista abaixo do card (ou filtra). Reusa `keywords`/`estilo` já no JSON.

## MELHORIA DO EXPORT (o "muito simples")
Hoje: `image_prompt`/`brief` são strings fixas em data.json (estáticas, genéricas).
Refino em 2 camadas:
A) **Brief composto dinâmico** (funcionalidade 2) — gerado DOS cards favoritos/selecionados, não fixo.
B) **Export de prompt rico por card** — em vez de 1 string estática, `cardPrompt(i)` monta:
   - hero image prompt (estilo + paleta inferida das tags + "never slop" do vídeo)
   - build brief (4 pilares) específico do card
   Substitui o `data-copy` estático por `data-copy="${enc(cardPrompt(i))}"`.
C) **Copiar múltiplos**: botão "copiar todos os prompts do nicho" no header do grupo.
D) **Markdown clipboard**: o brief sai em MD (título, pilares, lista de refs) — cola direto no chat da IA / Notion.

## Ordem de execução (KISS, ondas)
- Onda 1: #1 (favoritar) + melhoria B (cardPrompt dinâmico) — base.
- Onda 2: #2 (moodboard + gerar brief) + D (MD clipboard).
- Onda 3: #3 (compare) + #4 (similares).

## Guardrails de implementação
- Manter single-file (index.html + data.json). Não criar bundle.
- `esc/enc/dec/domain` já existem — reusar.
- localStorage pode falhar em file:// (CORS) — tratar try/catch, degradar sem erro.
- Validar com `npm run lint` + render Playwright (0 erros) antes de commit.
- Não mexer no B2-A (CSS já fechado).
