# Redesign — Pizzaria Premium (R$149) · Vitrine Certa

> Alvo: `site-dfy/pizzaria/premium/index.html`
> Conceito: **"A NOITE INTEIRA"** — o site é um sábado das 18:00 às 00:00, e ele **sabe que horas são**.
> Macroestrutura Hallmark: **14 · Narrative Workflow**
> Rev. 2 (22/07) — revisado contra as 5 skills de design do vault. Mudanças marcadas 🔁.

---

## 0. Auditoria do premium atual (arquivo real)

Lido em `site-dfy/pizzaria/premium/index.html` (17,9KB, 5 atos):

| Achado | Evidência | Problema |
|---|---|---|
| Narrativa já é "do forno ao cliente" | `<h1>Do <span>forno ao seu cliente</span></h1>` (l.122) | O conceito sugerido no briefing **já está gasto aqui** |
| Display = **Anton** | l.10 | Fonte nº1 de template grátis de pizzaria (gate 1 da Hallmark) |
| Body = **Inter** | l.10 | Marca d'água de UI gerada por IA (gate 1) |
| Marrom + caramelo + verde-menta | `--bg:#2A1A0F --a2:#D4A373 --a1:#A3D9A5` | Creme escurecido; e o verde-menta colide com a lavanderia |
| Motion = `translateY` + IO | 4× `translateY`, 2× `IntersectionObserver`, 1 `sticky` | Padrão proibido; nenhuma animação é scroll-driven |
| Mecânica = builder radial | `#radial-center`, `#builder-total` | É um **simulador de preço** — mesma espécie do quiz `#simule` do R$49 |

**Conclusão:** o premium atual é o Simples com fundo escuro. Os R$100/mês de diferença não estão de pé.

**Já feito nesta sessão:** `opcao-a/b/c.html` movidas para `_refs/pizzaria-opcoes-v1/` (+ README explicando o descarte).
**A fazer no passo 1:** `git mv premium/index.html premium/_v1-forno-ao-cliente.html`. Nada se apaga.

---

## 1. O que as skills do vault mudaram no plano

As 5 skills existem — em `C:/Users/kauea/AppData/Local/hermes/skills/` (não em `~/.claude/skills/`, por isso eu não as via). Li todas + duas vizinhas que ninguém citou e que mandam mais no resultado: `receita-zero-site-build` e `revenue-centric-design`.

| Skill | Veredito | Mudança no plano |
|---|---|---|
| `receita-zero-site-build` | ⚠️ **manda mais que o briefing** | 🔁 Teal cortado da paleta (petshop já é `#3FB6A8`, lavanderia é verde/teal — regra do user: "não quero que todos tenham a mesma cara"). Confirmado: venda nossa só no fim, nunca no meio. |
| `anti-ai-slop-site-design` | ✅ adotada inteira | 🔁 Macroestrutura declarada + carimbada; 🔁 nav e cardápio reestruturados (gates 42 e 3); 58 gates viram checklist do passo 7 |
| `revenue-centric-design` | ⚠️ **conflita com o conceito** | 🔁 Resolvido com tema dia/noite (abaixo) + checklist CRO aplicado |
| `aapson-site-design-ops` | ⚠️ só como fonte de *pitfalls* | Fraunces / Acid Circuit / Lenis **proibidos aqui** (isolamento). Aproveitado: spring `0.06`, medir contraste após repaint, `node --check` com caminho absoluto |
| `design-system-site-build` | ✅ parcial | Tokens vão pra um `DESIGN.md` da pizzaria, não freestyle no meio do CSS (gate 48) |
| `popular-web-designs` | ➖ pouco útil aqui | É catálogo de DNA de SaaS (Stripe/Linear/Vercel). Serve só a tabela de substituição de fonte |
| `scroll-world-portfolio-builder` | ❌ **rejeitada** | Depende de vídeo Higgsfield/Veo. **Veo custa R$0,589/s — 4 clipes de 6s = R$14,12.** Para um site de portfólio R$0 em GitHub Pages é caro e pesado. Meu scroll-driven é CSS puro, R$0, ~3KB. |

### 1.1 O conflito real, e como resolvi

`revenue-centric-design` diz, com todas as letras: *"Tema light, contraste alto. Evite fundo escuro em landing de conversão — o vídeo MyAds confirmou: light venceu"*. Meu conceito é uma noite escura.

Não vou fingir que não bate de frente. Resolução — 🔁 **o site tem duas caras, e a hora decide qual:**

- **Antes das 17h → tema CLARO** ("cal e sol"): parede branca-fria, tinta escura, forno apagado. É o que o dono de PME vê quando abre o site às 14h no celular em modo claro. Atende o revenue-centric.
- **Depois das 18h → tema ESCURO** ("a noite"): o conceito inteiro acende.
- **17h–18h → o crepúsculo**, interpolado.
- Botão manual de override no topo (dia/noite) pra demo — porque o dono vai querer mostrar as duas.

Isso não é concessão: é o conceito ficando **mais forte**. O site não tem tema, tem **hora**. E vira o momento de demo de 5 segundos: "olha, abre de manhã e de noite — é outro site".

O que peguei do revenue-centric sem discussão: 1 CTA dominante por seção, copy CATCH (concreto/ação/tensão/curto/humanizado), zero jargão, valor antes de preço, bloco "E se...", CTA visível no mobile sem scroll.

---

## 2. Referências (verificadas nesta sessão)

| Site | Verificado? | O que faz | Por que funciona | O que roubo |
|---|---|---|---|---|
| **robertaspizza.com** | ✅ fetch 22/07 | Vermelho + preto + branco, **ilustração autoral pesada** (chef-esqueleto, disco ball, pizza antropomórfica), bordas SVG (linhas, pontilhado, fumaça) | Não usa **nenhuma** foto de close de queijo escorrendo. A marca é o desenho, não o produto. Foto de comida é o que iguala todo site de PME | **SVG autoral no lugar de foto.** A boca do forno é desenhada. Bônus: mata o pitfall de hotlink do Unsplash documentado na `receita-zero-site-build` |
| **pizzeriavetri.com** | ✅ fetch 22/07 | Storytelling sobre **"4 days. 4 ingredients."**; fermentação acima de listagem de pratos; "Order Online" fixo na nav | Vende **tempo e processo**, não sabor. Um número carrega a marca. Prova de que narrativa temporal funciona em pizza — e vem de restaurante premiado, não de template | A espinha: **tempo é o herói**. Mas meu eixo é o *relógio da noite*, não o calendário da massa (senão copio a Vetri) |
| **tartinebakery.com / resy.com** | ❌ não verificável | Render 100% client-side; o fetch devolveu só "Skip to Main Content" | — | — |

⚠️ **Fonte:** as duas primeiras são leitura direta do HTML servido hoje. Tartine e Resy **não** foram abertas — não descrevo site que não consegui ler. Se quiser as duas na mesa, renderizo local com Chrome headless (comando na `anti-ai-slop-site-design/references/palette-mockup-render.md`) antes de citar.

---

## 3. Conceito — "A NOITE INTEIRA"

> Pizza não é produto de dia. É produto de **noite de sábado**.
> O site é uma noite: 18:00 forno frio → 23:30 última rodada. E abre no horário real do visitante.

Por que este e não outro:

1. **É funcional, não decorativo.** A pergunta nº1 no WhatsApp de qualquer pizzaria é *"tá aberto?"*. O site responde antes de perguntarem. Um dono de 48 anos entende em 4 segundos — e é isso que vende R$149.
2. **Dá paleta, tipografia, tema e motion de graça.** Frio por fora / brasa por dentro é um sistema inteiro, não uma escolha de cor.
3. **É São Vicente.** Orla, noite quente, letreiro aceso.

**Descartados:** *"Fermentação 48h"* — é a Vetri literal, e invisível pro cliente final. *"Mesa comunal"* — bonito, mas PME de São Vicente vende delivery, não salão.

**Regra de ouro:** nenhuma animação entra se não puder ser explicada como *"isso é a noite passando"*.

### 3.1 Carimbo obrigatório (gate 20)

```css
/* Hallmark · macrostructure: 14 Narrative Workflow · Vitrine Certa / Pizzaria Premium
   tema=hora-do-dia · acento=brasa (único) · display=Instrument Serif · dados=Instrument Sans tabular
   pre-emit critique: P5 H4 E4 S5 R4 V5 */
```

**Por que Narrative Workflow e não o trio padrão de restaurante** (Photographic · Long Document · Catalogue): o trio default é exatamente o que produz sites de restaurante idênticos. A página aqui *é* um percurso temporal com estado — Narrative Workflow é o encaixe semântico e, de quebra, o fingerprint mais distante do resto do portfólio (o padrão-ouro do petshop é Feature Stack).

---

## 4. Paleta + tipografia

### 4.1 🔁 Paleta — "a cor só existe quando o forno está aceso"

A mudança de rev.2: **fora o teal.** A pizzaria não ganha uma segunda cor de marca. O sistema é quase monocromático e o **único acento cromático é o fogo** — que só aparece quando o forno está aceso. Estado vira cor. Nenhum outro nicho do portfólio faz isso, e não colide com petshop/lavanderia/salão.

**Noite (18:00–00:00) — padrão do conceito**

| Token | Hex | Uso |
|---|---|---|
| `--tinta` | `#141A2A` | Fundo. Azul-noite — **não** preto, **não** marrom (gate 7) |
| `--carvao` | `#0C1120` | Chão do forno, rodapé |
| `--tinta2` | `#1C2438` | Superfícies elevadas (linhas do cardápio, comanda) |
| `--linha` | `#2B3450` | Bordas 1px |
| `--giz` | `#EDEFF5` | Texto principal — branco **frio** (anti-creme). 13,9:1 ✔ |
| `--fumaca` | `#98A0B8` | Secundário. 5,6:1 ✔ |
| `--brasa` | `#FF5A1F` | **Único acento.** Só onde há calor. 5,4:1 → **≥24px apenas** |
| `--nucleo` | `#FFF1E6` | Núcleo branco-quente do fogo (fisicamente correto: mais quente = mais branco) |

**Dia (00:00–17:00) — "cal e sol"**

| Token | Hex | Uso |
|---|---|---|
| `--tinta` | `#ECEDF1` | Parede caiada, branco **frio** azulado (não creme) |
| `--carvao` | `#DDDFE7` | Rodapé, base |
| `--tinta2` | `#F7F8FB` | Superfícies |
| `--linha` | `#D3D7E2` | Bordas |
| `--giz` | `#141A2A` | Texto (a mesma tinta, invertida) |
| `--fumaca` | `#5C6478` | Secundário. 6,2:1 ✔ |
| `--brasa` | `#D6410E` | Brasa escurecida pro claro. 4,7:1 ✔ **corpo permitido** |
| `--nucleo` | `#8A2B06` | Núcleo no claro |

Gradiente do fogo (o único gradiente do site): `--nucleo` → `--brasa` → transparente. Nada de gradiente em texto, nada de aurora, nada de blob.

**Disciplina:** `--brasa` é **luz**, nunca preenchimento de bloco. Teto de 3% da tela à noite, 1% de dia. Se passar disso, virou o template de sempre.

### 4.2 Tipografia — 2 fontes, com regra semântica

| Papel | Fonte (Google Fonts) | Pesos | Onde |
|---|---|---|---|
| Voz da casa | **Instrument Serif** | 400 + *italic* | h1, h2, nomes de pizza, depoimentos |
| Voz do forno | **Instrument Sans** | 400/500/600 + `tabular-nums` | relógio, preços, minutos, tabela de horários, UI |

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

**A regra que vira sistema:** *serifa = a casa falando com você; sans tabular = a máquina reportando.* "A noite inteira" é serifa. "21:47 · PICO · ~45 min" é sans tabular. **Nunca as duas na mesma frase.**

- Sem Fraunces (é da AAPSON — regra de isolamento) ✔ · sem Anton (queimada na v1) ✔ · sem Inter (gate 1) ✔
- Escala: `h1 clamp(2.75rem,7vw,5.5rem)/0.98` `ls -0.02em` · relógio `clamp(3rem,10vw,7rem)` peso 500 `ls -0.04em` · corpo `1.0625rem/1.55`
- Itálico da Instrument Serif é o único ornamento. Zero text-shadow.
- Tokens moram em `site-dfy/pizzaria/premium/DESIGN.md` — nenhum hex solto no CSS (gate 48).

---

## 5. Layout por seção (wireframe textual)

🔁 Duas mudanças estruturais vindas dos gates: a **nav** (42) e o **cardápio** (3).

```
┌─ NAV = RÉGUA DA NOITE (gate 42: nada de wordmark+links+botão) ───────┐
│  18 ─── 19 ─── 20 ─── 21 ●─── 22 ─── 23 ─┤              [☀/☾]      │
│         (marcas são âncoras; o ponto ● é a hora real)                 │
└──────────────────────────────────────────────────────────────────────┘
   ↑ a marca NÃO fica aqui — ela vive dentro do hero. Sem borda 1px, sem 5 links.

── 18:00 · HERO (assimétrico, gate 6) ───────────── 100dvh
   ESQ 55%                            DIR 45%
   [sans] 18:00                       ┌────────────────────────┐
   [serif] A noite                    │  SVG BOCA DO FORNO     │
   [serif italic] inteira.            │  arco de tijolo,       │
                                      │  brasa irregular,      │
   [sans muted] Forno a lenha.        │  pizza girando dentro  │
   Av. Exemplo, 000 — São Vicente     │  aria-hidden="true"    │
                                      └────────────────────────┘
   ┌ ESTADO AO VIVO ───────────────────────────────┐
   │ ● FECHADO — abre 18:00                        │  ← muda sozinho
   │ [ Programar pedido pras 18h ]  ← 1 CTA só     │
   └───────────────────────────────────────────────┘

── 18:40 · A MASSA ─────────────────────── fita horizontal
   [serif] "Começa 48 horas antes de você ter fome."
   3 blocos revelados por clip-path (não translateY):
   [ 48h antes · descanso ] [ ontem · sova ] [ hoje 16h · bolas ]
   3 SVGs autorais (círculos crescendo). Zero foto de massa.

── 19:30 · SAINDO DO FORNO (cardápio) ────────────────────
   🔁 NÃO é grid de 3 cards iguais (gate 3). É PAINEL DE FORNO — linhas,
      como painel de embarque. Ordenado por TEMPO DE FORNO, não por categoria.
   [ até 12 min ]  [ clássicas ]  [ especiais ]        ← chips de filtro
   ─────────────────────────────────────────────────────────
    ~9 min   Margherita      molho, muçarela, manjericão   R$ 45,00   [+]
   ~11 min   Calabresa       calabresa, cebola             R$ 48,00   [+]
   ~13 min   Portuguesa      ovo, presunto, ervilha        R$ 52,00   [+]
   ~16 min   Quatro Queijos  gorgonzola, provolone…        R$ 58,00   [+]
   ─────────────────────────────────────────────────────────
   "~9 min" recalcula com o estado da noite (pico = +18 min).
   Tempo em sans tabular, alinhado por dígito — a coluna vira o gráfico.

── 21:00 · O PICO ───────────────────────────────────────
   [serif] "O horário em que o forno não descansa."
   Depoimentos como COMANDAS PENDURADAS (giro -1.5°/+1°, borda serrilhada CSS,
   timbre "21:14") — não card com aspas.
   Faixa: [ 180 pizzas/sábado ] [ 48h de massa ] [ 12 anos de forno ]   ⚠️ DEMO

── 22:15 · ONDE A GENTE CHEGA ───────────────────────────
   Mapa SVG estático (sem iframe pesado) + bairros com tempo médio:
   Centro ~25min · Itararé ~30min · Pq. Bitaru ~35min · Jd. Rio Branco ~40min   ⚠️ DEMO

── 22:40 · E SE... (bloco de objeção — revenue-centric G) ─
   "E se demorar?"  → a gente avisa antes de sair o pedido
   "E se eu pedir tarde?" → última rodada 23:30, depois o forno apaga
   "E se eu quiser retirar?" → 10 min, sem taxa

── 23:30 · ÚLTIMA RODADA ────────────────────────────────
   [sans grande] 23:30
   [serif] "Depois disso, o forno apaga."
   Tabela de horários (sans tabular, alinhada por dígito)
   [ Pedir agora — WhatsApp ]   ← 1 CTA

┌─ RODAPÉ = COMANDA CARIMBADA (gate 43: nada de 4 colunas + social) ───┐
│  Recibo: endereço · telefone · horários · "forno apagado às 00:00"    │
│  Tudo em sans tabular, monocromático (o fogo já apagou)               │
└──────────────────────────────────────────────────────────────────────┘

── FIM · CTA VITRINE CERTA (isolamento: só aqui, nunca no meio) ──
   "Quer um site assim pro seu negócio?" → ../../receita-zero/#planos

┌─ COMANDA (fixa na base, aparece no 1º item) ────────────────────────┐
│  3 itens · R$ 141,00                        [ Enviar comanda → ]     │
└──────────────────────────────────────────────────────────────────────┘
```

Mobile (gates 50–57): hero em coluna (forno acima, 40vh); painel do cardápio vira 2 linhas por item; comanda em barra cheia com `safe-area-inset-bottom`; régua da noite encolhe pra `21:47 ●`; CTA do hero visível sem scroll.

---

## 6. Mecânica premium — "FORNO AO VIVO" + "COMANDA"

### 6.1 Forno ao Vivo (a mecânica-assinatura)

Bloco de config no topo do arquivo — **é isso que torna o template revendável**:

```js
/* ⚠️ DEMO — números fictícios de portfólio. Trocar pelos reais antes de entregar a cliente. */
const CASA = {
  tz: 'America/Sao_Paulo',
  abre: '18:00', ultimoPedido: '23:30', fecha: '00:00',
  fechadoNosDias: [1],              // segunda
  pico: ['20:00','22:00'],
  esperaBase: 25, esperaPico: 45,   // minutos
  bairros: { 'Centro':25, 'Itararé':30, 'Pq. Bitaru':35, 'Jd. Rio Branco':40 },
};
```

Estado derivado do relógio real via `Intl.DateTimeFormat` com timezone fixo (não confia no relógio do aparelho):

| Estado | Pill da régua | CTA do hero | WhatsApp pré-preenchido |
|---|---|---|---|
| `FECHADO` | ○ fumaça · "abre 18:00" | "Programar pedido pras 18h" | "Oi! Queria deixar um pedido pra hoje às 18h:" |
| `AQUECENDO` 18:00–18:20 | ◐ brasa fraca · "primeiras saem 18:20" | "Entrar na primeira fornada" | "Oi! Pego a primeira fornada?" |
| `ABERTO` | ● brasa · "~25 min" | "Pedir agora" | "Oi! Pedido:" |
| `PICO` | ● brasa cheia · "~45 min" | "Pedir agora (~45 min)" | "Oi! Pedido (sei que tá no pico):" |
| `ÚLTIMA RODADA` últimos 30min | ● brasa pulsando · "até 23:30" | "Última rodada — faltam 14 min" | "Oi! Dá tempo da última rodada?" |

Efeito colateral de design: uma CSS var `--calor` (0→1) sai do estado e **acende o site inteiro**. Fechado = sem cor nenhuma. Pico = brasa viva. 🔁 E `--dia` (0→1) faz o flip claro↔escuro. Duas variáveis governam a página toda.

### 6.2 Comanda (a mecânica de conversão)

- `[+]` na linha → item entra na barra fixa inferior, com contagem e total.
- Enviar → **uma** mensagem formatada:
  `Pedido — 21:47\n• 1x Margherita — R$45\n• 2x Calabresa — R$96\nTotal R$141\nEntrega: Itararé (~30 min)`
- Persiste em `localStorage` (volta depois e a comanda está lá).
- Sem carrinho falso, sem checkout falso. Fecha no WhatsApp, que é onde a PME vende.
- Botão no padrão `.wa-btn` da `receita-zero-site-build` (verde `#25D366`, pill, sombra) — único ponto onde entra cor fora do sistema, e é cor de plataforma, não de marca.

**Diferença de espécie vs o Simples:** o Simples faz *uma pergunta e devolve um preço*. O Premium **monta o pedido e conhece o horário do negócio**. Não é o mesmo mecanismo maior — é outro mecanismo.

---

## 7. Motion design

Regra: **nada de `translateY` como camada de parallax, nada de aurora/blob/glow de fundo.**

| # | Animação | Técnica | Justificativa narrativa |
|---|---|---|---|
| 1 | **A noite avança com o scroll** | `animation-timeline: scroll(root)` escrevendo `--noite: 0→1`; fallback JS `rAF` + `scrollY` na mesma var. Fundo por `color-mix(in oklab, …)` | Rolar *é* a noite passando. Única razão pra o scroll ser cinematográfico |
| 2 | **Tema pela hora** 🔁 | `--dia` interpola os dois conjuntos de tokens; crepúsculo 17–18h; override manual `[☀/☾]` | O site não tem tema, tem hora |
| 3 | **Relógio odômetro** | Dígitos em coluna com `overflow:hidden` + `translateY` **dentro do dígito**, `steps()` | É mecanismo de relógio, não camada de parallax |
| 4 | **Brasa irregular** | `@keyframes` em 0/17/23/61/79/100% sobre `filter:brightness()` + opacity de radial mascarado; duração 4,7s (primo, não fecha loop óbvio) | Fogo não pulsa em ritmo. Loop regular é assinatura de IA |
| 5 | **Reveal por máscara** | `clip-path: inset(100% 0 0 0)` → `inset(0)`, 520ms `cubic-bezier(.22,1,.36,1)`, via IntersectionObserver | O conteúdo **sai do forno** (varre de baixo pra cima). Substitui o fade+slide de todo mundo |
| 6 | **Pizza girando na boca** | `rotate` linear 26s no `<g>` do SVG, pausa em `:hover` | É uma pizza no forno. Literal — por isso não é gratuito |
| 7 | **Comanda entrando** | `translateY(100%)→0` com `cubic-bezier(.2,.9,.25,1.15)` só no 1º item; badge `scale(1→1.25→1)` | Feedback de ação. É UI, não cenário |
| 8 | **Reordenar cardápio** | `view-transition-name` nas linhas quando suportado; senão FLIP simples | Reordenar por tempo de forno tem que ser legível |

**Spring:** onde houver interpolação contínua, `cur += (target-cur)*0.06` — valor já validado no `aapson-site` (0.12 ficou rápido demais).

**`prefers-reduced-motion: reduce`:** `--noite` passa a mudar por seção (degrau); brasa estática; clip-path vira opacity instantâneo; odômetro troca o número direto. O site continua contando a noite — só não anima.

**Orçamento:** zero biblioteca, zero build, arquivo único (padrão do repo). Só `transform`/`opacity`/`clip-path`/`filter`. Alvo <60KB, LCP no SVG inline (sem request). **Sem Lenis** (é do aapson-site, e isolamento proíbe).

---

## 8. Diferencial vs Simples (R$49)

| | Simples R$49 | Premium R$149 (redesign) |
|---|---|---|
| Conceito | Landing de pizzaria | Uma noite, das 18h à última rodada |
| Macroestrutura | Feature Stack (padrão do portfólio) | **Narrative Workflow** — fingerprint próprio |
| Sabe o horário? | ❌ | ✅ **Estado ao vivo** (5 estados) |
| Tema | Fixo | 🔁 **Claro de dia, escuro de noite** — o site muda sozinho |
| Espera de entrega | ❌ | ✅ Estimativa que sobe no pico |
| Pedido | Quiz → sugere 1 pizza | **Comanda**: N itens, total, 1 mensagem formatada, persiste |
| Bairros | ❌ | ✅ Tempo médio por bairro |
| Paleta | Tomate/laranja/ouro (`#C0392B #E67E22 #F1C40F`) | Noite + brasa única (`#141A2A #FF5A1F`) — sem colidir com nenhum outro nicho |
| Tipografia | Genérica + Inter | Instrument Serif (casa) + Instrument Sans tabular (forno) |
| Imagem | Fotos de banco | **SVG autoral** — e some o pitfall de hotlink do Unsplash |
| Motion | Fade + slide | Scroll-driven, brasa irregular, reveal por máscara |
| CTA WhatsApp | Fixo | Muda com o estado da noite |
| Manutenção | Editar HTML | Bloco `CASA {}` no topo |

**Frase de venda (CATCH, uma linha):** *"Seu site responde 'tá aberto?' sozinho e monta o pedido pronto no seu WhatsApp — inclusive às 23h, quando você não pode responder."*

---

## 9. Plano de execução

> **STATUS 22/jul: passos 0–9 concluídos e verificados.** Falta só o passo 10 (commit).
> **Rev. 3 — forno redesenhado (variante B).** SVG refeito a partir de referência fotográfica:
> cúpula abaulada com fiadas curvas, anel de aduelas saliente, fogo ao fundo com toras em V,
> leito de cinzas com brasa por baixo, bloom e tremor de ar quente, pizza na bancada.
> `?demo` roda a noite em 40s. Página de escolha do forno: `_checkpoint/comparar-forno.html`.
> **Painel de horas (QA + demonstração):** `_checkpoint/painel-de-horas.html` — o site real em
> iframe, com cursor de hora, atalhos por estado, "rodar a noite" e alternância desktop/celular.
> Referências em `_ref/` (2 Gemini ≈ R$5–6,60 + 2 Pollinations R$0 — **o Pollinations bastava**).
> Entregue: `site-dfy/pizzaria/premium/index.html` (45KB, zero dependência).
> Prints em `_checkpoint/`. Testes: Playwright em 5 horas + comanda + filtro + reduced-motion + 320px.

| # | Passo | Saída | Checkpoint |
|---|---|---|---|
| 0 | Aprovar este plano | — | ✅ |
| 1 | `git mv premium/index.html premium/_v1-forno-ao-cliente.html` | v1 preservada | — |
| 2 | `DESIGN.md` da pizzaria (tokens dia+noite, tipografia, carimbo Hallmark) | fonte de verdade | — |
| 3 | Shell: régua da noite, `--noite`/`--calor`/`--dia`, reduced-motion, rodapé-recibo | esqueleto renderizável | print em 3 pontos do scroll |
| 4 | **SVG da boca do forno** (autoral, inline, ~4KB) + hero + painel de estado | hero completo | 🚦 print do hero em 3 estados: **dia claro / noite fechada / pico** — *aqui se decide se o redesign funciona* |
| 5 | Motor `CASA{}` + 5 estados + CTA dinâmico | testável via `?h=21` | rodar as 5 horas |
| 6 | Painel de forno (cardápio em linhas) + filtros + **comanda** + localStorage | mecânica completa | 🚦 add 3 itens → WhatsApp com texto certo |
| 7 | Massa · Pico · Bairros · E se… · Última rodada | página inteira | — |
| 8 | **Auditoria de gates** (58 da Hallmark) + revenue-centric checklist | relatório de FAIL→FIX | 🚦 zero FAIL |
| 9 | Validação técnica | `node --check` (caminho absoluto), `python -m http.server 8736`, Chrome `--headless=new` em 375/768/1440, contraste medido **após repaint**, 0 pageerror, `?h=` nas 5 horas, reduced-motion on | 🚦 aprovação final |
| 10 | `PLANO-PREMIUM.md` l.16 + link da landing + commit | docs | — |

### 9.1 Gates que vou checar no passo 8 (os que mais disparam)

`1` display não-Inter ✔ · `3` sem grid de 3 cards iguais 🔁 (virou painel) · `5` sem side-stripe · `6` hero assimétrico ✔ · `7` sem `#000`/`#fff` puro ✔ · `8` fingerprint diferente do resto do portfólio ✔ · `20` carimbo ✔ · `33` `aria-hidden` no SVG do forno ✔ · `34` `overflow-x: clip` em html+body · `42` nav rotada 🔁 · `43` rodapé rotado 🔁 · `44` respiro do hero · `46` métrica inventada → **liberado por você, mas marcado `⚠️ DEMO` no HTML** · `48` tudo em `var(--token)` ✔ · `49` link clicável sem quebra de linha · `54` eyebrow empilhado, não ao lado ✔

### 9.2 Riscos que sobraram

1. **Números fictícios.** Você liberou (é portfólio). Vão com comentário `⚠️ DEMO — trocar antes de entregar` em cada bloco, pra ninguém publicar "180 pizzas/sábado" no site de um cliente real por descuido.
2. **`animation-timeline: scroll()`** não pega em Safari antigo → fallback rAF é obrigatório, não opcional. Já está no plano.
3. **Dois temas dobram a superfície de bug de contraste.** A `aapson-site-design-ops` documenta exatamente isso ("tema claro puxa cor escura, textos somem") — por isso o passo 9 mede contraste real no browser **após repaint**, nos dois temas.

---

## 9.3 Bugs encontrados na construção (para não repetir nos outros 7 nichos)

| # | Bug | Causa | Correção |
|---|---|---|---|
| 1 | Conteúdo com 793px em vez de 1180px | `margin-inline:auto` num item de **flex column** cancela o stretch do cross-axis; o wrap encolhe pro tamanho do conteúdo | `inline-size:100%` no `.wrap` |
| 2 | Relógio odômetro saía `⌐.CC` | a fita de dígitos herdava `line-height:1.55` do body e não batia com o passo do `translateY` | `line-height` fixo na fita e em cada dígito |
| 3 | **Contraste 1,02:1 no crepúsculo** — texto invisível | interpolar o tema continuamente cruza fundo e texto no mesmo cinza médio em `--dia≈.5` | tema em **degrau**; só o fundo faz crossfade, a cor do texto vira de uma vez (delay .25s) |
| 4 | **Seção inteira invisível** — 5 reveals nunca apareciam | `clip-path:inset(100%)` zera a área visível e o IntersectionObserver mede `ratio 0` pra sempre: o alvo escondia a si mesmo do observer | observa a **seção** (nunca clipada); o clip mora nos filhos; estado escondido só sob `html.js` |
| 5 | `--noite` parado em 0 no Chrome | o fallback rAF só roda quando `scroll()` **não** existe, e faltava a animação CSS pro caso em que existe | `@keyframes anoitecer` + `animation-timeline:scroll(root)` |
| 6 | Hora do WhatsApp saía `01234567890...` | lia `textContent` do odômetro, e cada dígito contém a fita `0123456789` inteira | variável `horaTxt` própria, nunca ler hora do DOM |
| 7 | Preço `R$ 142` em vez de `R$ 142,00` | `toString()` em vez de formatação BRL | `toFixed(2).replace('.',',')` |

> Os bugs 3, 4 e 5 só apareceram porque a verificação foi **medida** (pixels do PNG + Playwright),
> não olhada. Nenhum deles dava erro no console. O nº 4 foi apontado pelo agente paralelo (Hermes).

## 10. Nota de retratação

Na rev.1 eu disse que as 5 skills do briefing "não estão instaladas". Estava errado: elas existem em `C:/Users/kauea/AppData/Local/hermes/skills/` — eu só olhei `~/.claude/skills/`. Ler as skills mudou 6 coisas do plano (paleta, nav, cardápio, tema dia/noite, macroestrutura, scroll-world descartada). A busca no vault valeu mais que o briefing.

## Adequação MIFB (UI polish)
> Skill `make-interfaces-feel-better` (19 princípios). Receita Zero (index + checkout) já adequado.
> - ⏳ `site-dfy/pizzaria/index.html` — fase 2 (font-smoothing, tabular-nums, scale-on-press, hit areas)
> - Ver `references/aapson-rollout-plan.md` no skill para detalhes completos
