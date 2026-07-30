# Redesign — Oficina Premium (R$149) · Vitrine Certa

> Alvo: `site-dfy/oficina/premium/index.html`
> Conceito: **"VOCÊ VÊ O QUE A GENTE VÊ"** — o site não é folheto, é a **janela para dentro da oficina**.
> Macroestrutura Hallmark: **05 · Workbench**
> Método: skill `site-premium-redesign`. Nicho 2 de 8.

---

## 0. Auditoria do premium atual

| Achado | Evidência | Problema |
|---|---|---|
| Tudo centralizado no mesmo eixo | todas as seções abrem com `style="text-align:center"` + eyebrow + h2 | Gate 6. É o hero→3 blocos→CTA que qualquer LLM cospe |
| Estrutura genérica | `#orcamento` · `#garantia` · `#servs` · `.cta-final` | Gate 8: template de IA, sem fingerprint próprio |
| Paleta dark-neon de SaaS | `--bg:#08090B` · `--a1:#27E0A0` · `--a2:#1FA8FF` · `--a3:#9CFE00` | Não é oficina, é dashboard. E **`#9CFE00` encosta no chartreuse `#D9F03A` da AAPSON** — risco de isolamento |
| Motion | 5× `translateY` + 1 IntersectionObserver | Padrão proibido, nada scroll-driven nem input-driven |
| **Mecânica = "Monte seu serviço, o total atualiza na hora"** | `#orcamento` | **Mesma espécie do quiz do R$49.** Escolhe opções → cospe preço. É o erro exato que a pizzaria tinha |

**Conclusão:** dos dois premiums auditados até aqui, este é o mais fraco. O da pizzaria ao menos
tinha atmosfera própria; este é um template escuro com neon.

**Preservar:** `git mv premium/index.html premium/_v1-orcamento-neon.html`.

---

## 1. Referências

> **Correção (apontada pela dona):** a primeira leva que eu trouxe era de **sites do setor**,
> não de premiação. Eles dão a **dor do negócio**, não direção visual. As referências de design
> abaixo saíram da galeria **SiteInspire**, e depois abri cada site.

### 1.A · Design — via galeria SiteInspire (verificadas nesta sessão)

| Site | Verificado? | O que faz | O que eu roubo |
|---|---|---|---|
| **zerocarbonshipping.com** (Mærsk Mc-Kinney Møller Center) | ✅ fetch 22/07 | Neutro — brancos, cinzas, pretos. Dados técnicos viram **números isolados e enormes** (`100.000` navios, `300M ton`, `3%`) em vez de gráficos. Grade modular pensada para leitura rápida por público técnico | **Número grande e isolado no lugar de gráfico.** Vai direto na faixa de estatística da oficina e no cabeçalho da ficha (OS, previsão, dias de garantia) |
| **vestrehabitats.no** (Vestre, fabricante) | ✅ fetch 22/07 | O caráter industrial **não vem de estética de fábrica** — vem de honestidade de material e de estrutura. Zero decoração "galpão" | A regra mais útil das três: **não fantasiar de oficina.** Nada de chapa xadrez, textura de graxa ou fita zebrada. O industrial nasce da grade e do dado exposto |
| **polybion.bio** (biomanufatura) | ✅ fetch 22/07 | Fundo claro, respiro generoso, sans de peso alto na hierarquia. Processo explicado por **evidência (foto do processo)**, não por diagrama. Sem monoespaçada | Respiro alto num tema técnico — técnico não precisa ser apertado. ⚠️ Contraponto útil: ela **não** usa mono. Mantenho a minha, mas só onde é dado de OS de verdade — mono como informação, nunca como enfeite "tech" |

**O que as três têm em comum e derruba o premium atual:** todas são **claras, neutras e generosas**.
Nenhuma usa dark-neon. O arquivo que está no ar hoje (`#08090B` + verde `#27E0A0`) está no
extremo oposto do que ganha prêmio nesse registro.

### 1.B · Domínio — sites do setor (verificadas, mas valem pela dor, não pelo design)

| Site | Verificado? | O que faz | O que isso me diz |
|---|---|---|---|
| **christianbrothersautomotive.com** (→ cbac.com) | ✅ fetch 22/07 | Azul e branco, layout convencional. Vende a **"Nice Difference Warranty" (3 anos / 36.000 milhas)** como número. Depoimento em destaque elogia que os técnicos *"communicate and give you updates"* | O diferencial que a rede escolheu vender **não é preço nem qualidade técnica: é ser avisado**. Isso valida a dor. |
| **shopmonkey.io** | ✅ fetch 22/07 | Software B2B para oficinas. Vende **inspeção digital do veículo enviada por SMS/e-mail** explicitamente para "build customer trust" | A indústria já sabe que foto + laudo = confiança. Mas está vendendo isso **para a oficina**, como ferramenta interna. |
| **midas.com** | ✅ fetch 22/07 | Fundo claro, garantias como produto ("Golden Guarantees"), termos com nota de rodapé explícita, menus +/− com revelação progressiva, CTA "Get a Repair Estimate" | Transparência tratada como **argumento de venda estruturado**, não como adjetivo. E revelação progressiva funciona para informação técnica. |

### 1.1 O buraco que as três deixam

As três **falam** de transparência. **Nenhuma deixa o cliente ver o próprio carro.** O status
existe — mas dentro de um software B2B, chegando ao cliente por SMS. **Ninguém põe isso no site
da oficina.** É esse o wedge do premium.

---

## 2. Conceito — "VOCÊ VÊ O QUE A GENTE VÊ"

> O medo de quem deixa o carro na oficina não é o preço. É **ser passado para trás** — não saber
> o que foi feito, se precisava mesmo, e quando fica pronto.
> O site responde as duas perguntas que o dono da oficina responde no telefone o dia inteiro:
> **"e aí, tá pronto?"** e **"por que tá tão caro?"**

Estrutura: a página **não conta uma história, é uma ferramenta**. Abre já utilizável.
Por isso **Workbench (05)** — categoricamente distante do Narrative Workflow da pizzaria.

### 2.1 Contraste deliberado com a pizzaria

| | Pizzaria | Oficina |
|---|---|---|
| Macroestrutura | 14 Narrative Workflow | **05 Workbench** |
| Governa a página | o **relógio** (hora do dia) | a **entrada do usuário** (a placa) |
| Motion | scroll-driven, a noite passando | **input-driven**: quase nada anima no scroll; o movimento acontece na consulta |
| Luz | escuro, noturno | **claro, luz de galpão** |
| Cor | acento único quente (brasa) | **sem cor de marca** — cor só existe como código de status |
| Tipografia | serifa editorial + sans | **grotesk industrial + monoespaçada** |
| Voz | "A noite inteira." | "Placa ABC1D23 · na bancada 3 desde 14:20" |

Se as duas páginas ficarem lado a lado, nada indica que saíram da mesma mão. É o objetivo.

### 2.2 Carimbo obrigatório (gate 20)

```css
/* Hallmark · macrostructure: 05 Workbench · Vitrine Certa / Oficina Premium
   governado por=input(placa) · cor=codigo de status, sem cor de marca
   display=Archivo Expanded · dados=IBM Plex Mono
   pre-emit critique: P5 H4 E4 S5 R4 V5 */
```

---

## 3. Mecânica premium

### 3.1 CONSULTA POR PLACA (assinatura)

Campo de placa no hero. O visitante digita e recebe a **ficha da ordem de serviço**:

```
ABC1D23 · Gol 1.6 2019 · prata
OS 2418 · entrada seg 14:20 · previsão qua 17:00

recebido ──── diagnóstico ──── orçamento ──── execução ──── teste ──── pronto
                                    ▲ você está aqui — aguardando sua aprovação

quem está no carro:  Everton (mecânico)  ·  bancada 3
```

Estados possíveis: `recebido` · `em diagnóstico` · **`aguardando sua aprovação`** ·
`em execução` · `em teste` · `pronto para retirada`. Cada um muda o CTA e o texto do WhatsApp,
igual ao motor da pizzaria — mas disparado por **placa**, não por hora.

**Por que isso vende:** mata o telefonema. O dono de oficina é interrompido dezenas de vezes
por dia com "tá pronto?". Ele entende o valor em 3 segundos.

### 3.2 LAUDO COM APROVAÇÃO ITEM A ITEM

O que a Shopmonkey vende como ferramenta interna, aqui vira página pública. Cada achado do
diagnóstico é uma linha:

```
□ Pastilha dianteira 2mm — abaixo do limite      URGENTE   R$ 320  [aprovar] [recusar]
□ Filtro de ar saturado                          RECOMEND. R$  90  [aprovar] [recusar]
□ Correia com microfissuras                      ATENÇÃO   R$ 240  [aprovar] [recusar]
□ Óleo dentro do prazo                           OK          —
```

Marca o que aprova → soma → **manda uma mensagem só no WhatsApp com a decisão**.

**Diferença de espécie vs o Simples:** o Simples (e o premium atual) **calculam um preço**.
Este **mostra um diagnóstico e pede uma decisão**. Um é calculadora, o outro é laudo.

### 3.3 Terceiro: TABELA ABERTA

Preços de serviços tabelados publicados na página, com o que está incluso e o que não está —
o oposto do "consulte-nos". Aprendido da Midas: transparência como argumento estruturado, com
as condições explícitas, não como adjetivo.

---

## 4. Paleta e tipografia

### 4.1 A oficina não tem cor de marca

Todo nicho do portfólio tem um par de cores. Este **não vai ter** — e é isso que o separa.
A identidade é a **grade e a tipografia**; a cor aparece só como **código de status**, do jeito
que aparece numa oficina de verdade (marcação de piso, etiqueta de peça, luz de painel).

| Token | Hex | Uso |
|---|---|---|
| `--concreto` | `#E9E7E2` | Fundo. Piso de concreto polido — cinza morno, **não creme** |
| `--concreto2` | `#DCD9D2` | Faixas, cabeçalho de tabela |
| `--grafite` | `#191C21` | Texto e superfícies escuras |
| `--fumo` | `#5E646E` | Secundário |
| `--risco` | `#C9C6BF` | Linhas de grade 1px |
| `--aviso` | `#C77D0A` | status: aguardando aprovação |
| `--exec` | `#2F6F9E` | status: em execução |
| `--pronto` | `#2E7D50` | status: pronto para retirada |
| `--urgente` | `#B3402C` | achado urgente no laudo |

Colisão conferida contra os 7 outros nichos: salão rosa/violeta · clínica teal/azul ·
lavanderia verde/teal · padaria âmbar · pizzaria vermelho→noite/brasa · pet coral/teal ·
imobiliária navy/ouro · oficina-simples azul/laranja. **Nenhum é neutro.** Este é.
As 4 cores de status aparecem só em pastilha e em linha de laudo — nunca como fundo de seção.

### 4.2 Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| Voz da oficina | **Archivo** (com eixo *Expanded* nos títulos) | h1, h2, rótulos de seção |
| Voz do dado | **IBM Plex Mono** | placa, nº de OS, horário, preço, código de peça, torque |

Regra semântica (o equivalente à da pizzaria, mas invertida): **grotesk = gente falando ·
mono = o que está escrito na ordem de serviço.** Placa nunca sai em grotesk.

Sem Instrument Serif/Sans (é da pizzaria) · sem Fraunces (é da AAPSON) · sem Inter (gate 1).
Archivo Expanded em caixa alta dá cara de sinalização de galpão, não de startup.

---

## 5. Layout (wireframe)

```
┌─ BARRA DE ESTADO DA OFICINA (gate 42: nem nav de links, nem régua da pizzaria) ──┐
│  ● 7 carros na oficina   ● 2 prontos p/ retirada        Auto Center Vila  [☰]   │
└──────────────────────────────────────────────────────────────────────────────────┘

── HERO = O CONSOLE (Workbench: abre já utilizável) ────────────────
   ESQ                                      DIR
   [grotesk exp] VOCÊ VÊ                    ┌────────────────────────┐
   O QUE A GENTE VÊ                         │ SVG: planta da oficina │
                                            │ 4 bancadas em corte,   │
   [mono] consulte pela placa:              │ a ocupada acende       │
   ┌───────────────┐                        │ (grade de blueprint)   │
   │  A B C 1 D 2 3│  [consultar →]         └────────────────────────┘
   └───────────────┘
   [mono muted] tente ABC1D23 · XYZ4B56 · QRS7C89

   ↓ ao consultar, a ficha MONTA no lugar do SVG (não abre modal)

── A FICHA (aparece na consulta) ───────────────────────────────────
   trilho de 6 estágios · quem está no carro · previsão · CTA por estado

── O LAUDO — aprovação item a item ─────────────────────────────────
   linhas com severidade, preço, aprovar/recusar → barra de decisão fixa

── TABELA ABERTA — preços tabelados, com o que NÃO está incluso ────

── QUEM MEXE NO SEU CARRO — nomes, tempo de casa, especialidade ────

── E SE… — objeções (revenue-centric) ──────────────────────────────

── GARANTIA — número explícito, com as condições (lição da Midas) ──

── RODAPÉ = CARIMBO DE OS (nem 4 colunas, nem o cupom da pizzaria) ─

── FIM: CTA Vitrine Certa (só aqui, regra de isolamento) ───────────
```

---

## 6. Motion — input-driven, não scroll-driven

Contraste direto com a pizzaria: lá o scroll era o motor. Aqui **quase nada anima no scroll**;
o orçamento de movimento vai todo para o momento da consulta.

| # | Animação | Técnica | Justificativa |
|---|---|---|---|
| 1 | Ficha **monta** linha a linha | stagger de 40ms, `clip-path` horizontal | é a OS sendo impressa |
| 2 | Trilho de estágios **preenche** até o atual | `stroke-dashoffset` em transição, não em loop | é o carro avançando na oficina |
| 3 | Placa formata sozinha enquanto digita | máscara `AAA0A00` | feedback de campo |
| 4 | Bancada acende na planta | `fill` transiciona no SVG | mostra onde o carro está |
| 5 | Barra de decisão do laudo | sobe com spring `0.06` | é UI, não cenário |
| 6 | Grade de blueprint | `background-position` lentíssimo (60s) | ambiente, não protagonismo |

`prefers-reduced-motion`: tudo vira troca de estado instantânea. A ficha continua correta.

---

## 7. Diferencial vs Simples (R$49)

| | Simples R$49 | Premium R$149 |
|---|---|---|
| Mecânica | quiz: carro + serviço → preço | **consulta por placa** → status real da OS |
| Decisão | nenhuma | **laudo com aprovação item a item** |
| Preço | estimativa no quiz | **tabela aberta**, com o que não está incluso |
| Confiança | "somos de confiança" | nome do mecânico, bancada, previsão, garantia com condições |
| Governado por | nada | entrada do usuário |
| Cor | azul/laranja | **nenhuma cor de marca** — só código de status |
| Tipografia | genérica | Archivo Expanded + IBM Plex Mono |

**Frase de venda (CATCH):** *"Seu cliente para de te ligar perguntando se tá pronto — ele
consulta a placa e vê. E aprova o orçamento sem você ter que insistir."*

---

## 8. Execução

| # | Passo | Checkpoint |
|---|---|---|
| 0 | Aprovar este plano | 🚦 **você aqui** |
| 1 | `git mv` do v1 + `DESIGN.md` com os tokens | — |
| 2 | Shell: barra de estado, grade de blueprint, tipografia, reduced-motion | — |
| 3 | **SVG da planta da oficina** (4 bancadas em corte) + hero-console | 🚦 print do hero |
| 4 | Motor `OFICINA{}` + 6 estados + consulta por placa + a ficha | 🚦 consultar as 3 placas de teste |
| 5 | Laudo com aprovação + barra de decisão + WhatsApp | 🚦 aprovar 2 itens → mensagem certa |
| 6 | Tabela aberta · equipe · e se… · garantia · rodapé-OS | — |
| 7 | Auditoria de gates + verificação medida (pixel + Playwright) | 🚦 zero FAIL |
| 8 | Painel de estados (como o de horas da pizzaria, mas por placa) | — |

### 8.1 Riscos

1. **Dado fictício.** Liberado (portfólio), com `⚠️ DEMO` em cada bloco e as 3 placas de teste
   visíveis no hero — ninguém pode achar que é o carro dele.
2. **Promessa operacional.** O site sugere que a oficina atualiza o status. Na entrega real isso
   precisa de um jeito de o dono mexer (planilha, form, ou o bloco `OFICINA{}` na mão).
   **Se não houver quem atualize, a mecânica vira mentira** — mesmo risco do `CASA{}` da pizzaria,
   e vai no checklist de handoff.
3. **Placa é dado pessoal.** Em cliente real, consulta por placa expõe informação de terceiro.
   Na versão de portfólio não importa; na entrega, exigir um segundo fator (últimos 4 dígitos do
   telefone) antes de mostrar a ficha. Anotado agora para não virar problema depois.

## Adequação MIFB (UI polish)
> Skill `make-interfaces-feel-better` (19 princípios). Receita Zero (index + checkout) já adequado.
> - ⏳ `site-dfy/oficina/index.html` — fase 2 (font-smoothing, tabular-nums, scale-on-press, hit areas)
> - Ver `references/aapson-rollout-plan.md` no skill para detalhes completos
