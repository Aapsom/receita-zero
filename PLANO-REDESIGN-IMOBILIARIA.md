# PLANO — Imobiliária Premium · "O PREÇO INTEIRO"

Nicho 4 do portfólio Vitrine Certa. Braço isolado da AAPSON.
Cliente fictício: **Imóveis Vértice** — São Vicente/SP.

---

## 1. Auditoria do arquivo atual (`site-dfy/imobiliária/premium/index.html`)

| # | Achado | Gravidade |
|---|---|---|
| 1 | **É o simples escurecido e invertido.** Simples: bege `#F4F1EA` + navy `#1F3A5F` + ouro `#C9A24B`. Premium: marrom `#0C0A07` + o mesmo ouro `#E0A63C`. Mesma paleta, luz trocada — defeito nº 2 da skill. | alta |
| 2 | **Macroestrutura = o trio default do domínio.** Hero foto → `Catálogo` → `Onde ficam` (mapa) → CTA. É literalmente Photographic · Catalogue · Map/Diagram, o que todo site de imobiliária faz. | alta |
| 3 | **19 Map/Diagram já foi usado no salão** — repetiria a coluna do gate. | alta |
| 4 | Template genérico compartilhado com lavanderia/pet: mesmos tokens `--bg/--surface/--line/--a1/--a2/--a3`, mesmas classes `.reveal .grad .eyebrow`. Trocar o hex não troca o site. | alta |
| 5 | **Não faz nada que o simples não faça.** Os dois listam imóveis e abrem WhatsApp. Não há mecânica que justifique R$ 149. | alta |

## 2. Referências — só o que abriu de verdade

| Fonte | Verificado | O que rendeu |
|---|---|---|
| [Awwwards · Real Estate](https://www.awwwards.com/websites/real-estate/) | ✔ galeria lida | 19 sites premiados: ERA Residence, Elephant Skin, LIKOVA, Stone Investment, Fort Vega, Hubtown, Luxury Places, Loft 31, Modus Projects, Place Laval… **Todos são vitrine fotográfica, portfólio ou catálogo.** Nenhum mostra quanto custa morar ali. Confirma o trio default — e confirma que o buraco é preço, não foto. |
| [stoneinvestment.fr](https://stoneinvestment.fr/en) | ❌ conteúdo truncado | citado só como nome na galeria; **nenhuma afirmação de design tirada dele** |
| [likova.space](https://likova.space) | ❌ HTTP 403 | idem |
| [Lei do Inquilinato — caução](https://blog.icatuseguros.com.br/meu-dinheiro/lei-inquilinato/) · [art. 37 § único](https://geracontratos.com.br/recursos/caucao-3-meses-lei) | ✔ | caução ≤ **3 aluguéis**; **só UMA garantia** pode ser exigida (caução *ou* fiador *ou* seguro-fiança — empilhar é irregular) |
| [Seguro incêndio — quem paga](https://piramides.com.br/blog/mercado-imobiliario/lei-do-inquilinato-seguro-incendio/) · [OMA](https://oma.com.br/2025/09/01/seguro-incendio-no-aluguel-quem-paga-e-por-que/) | ✔ | seguro incêndio e IPTU são do **locador** (art. 22, VIII) — chegam no inquilino só por cláusula de repasse |

> Achado que virou o projeto: o mercado premiado de imobiliária compete em **fotografia**.
> O problema real do inquilino de bairro é **quanto sai por mês, tudo somado** — e isso é
> um problema de *fintech*, não de vitrine.

## 3. Conceito — **"O PREÇO INTEIRO"**

O anúncio diz R$ 1.200. O boleto chega R$ 1.821.
A página existe para fechar essa distância antes da visita, não depois do contrato.

Você diz quanto cabe no seu mês. A lista se parte em duas: **o que cabe** e **o que
estoura — com o motivo**. Abrir um imóvel abre a **conta**: cada linha somada na sua
frente, cada uma marcada com **quem a lei diz que paga**. No fim, o número que ninguém
publica: quanto você precisa ter no bolso para entrar.

**O "não" que justifica o premium:** este site diz quais imóveis você *não* deve visitar,
e diz que o IPTU e o seguro incêndio são, por lei, do proprietário — estão no seu boleto
porque o contrato repassa. Nenhum concorrente de R$ 49 se arrisca a isso.

## 4. Gate de repetição

| Nicho | Conceito | Macroestrutura | Motor | Objeto |
|---|---|---|---|---|
| Pizzaria | A noite inteira | 14 Narrative Workflow | hora real | uma casa mudando de estado |
| Oficina | Você vê o que a gente vê | 05 Workbench | consulta por placa | um registro |
| Salão | O que sobrou de hoje | 19 Map/Diagram | duração do serviço | um dia com buracos |
| **Imobiliária** | **O preço inteiro** | **04 Stat-Led** | **dinheiro (orçamento)** | **uma conta de mês** |

Os três anteriores têm motor de **tempo**. Este é o primeiro de **dinheiro** — é o salto
maior do portfólio até aqui. Stat-Led é inédito na coluna e é a inversão exata do default
do domínio (Photographic): **o número lidera, a foto vem depois**.

## 5. Paleta — "segunda via de um contrato"

Frio de propósito, para não encostar em nada já usado: o salão é papel argila *quente*,
a pizzaria é creme, o simples desta imobiliária é bege + ouro.

| Token | Hex | Uso |
|---|---|---|
| `--papel` | `#EDEFF2` | fundo, cinza-frio de formulário |
| `--via` | `#FFFFFF` | a conta — é uma folha, tem que ser branca |
| `--linha` | `#C6CDD6` | fio de 1px e os pontilhados |
| `--tinta` | `#141C27` | texto |
| `--fumo` | `#5B6675` | secundário |
| `--cofre` | `#0F5A4A` | **único acento** — só o número que importa |

"Não cabe" **não ganha vermelho: perde a cor.** Fica cinza, riscado, com o motivo escrito.
Evita o par verde/vermelho (ruim para daltônico) e mantém o acento em ≤ 6% da tela.

**Tipografia:** **Newsreader** (serifa de documento — a imobiliária fala) + **Space Grotesk**
com `tabular-nums` (a conta soma). Regra: *serifa = gente · grotesk tabular = dinheiro.*
Banidas: Fraunces + paleta Acid Circuit (AAPSON), Instrument (pizzaria), Archivo e IBM Plex
Mono (oficina), Gloock e DM Sans (salão), Anton, Inter, Playfair, Bodoni.

**Forma:** a assinatura é o **sistema de fios** — pontilhado de fatura entre rótulo e valor,
e fio duplo acima do total. Raio 2px (oficina é 0, salão é 3 — nenhuma folha se lê igual).

**Movimento:** uma só. As linhas da conta **imprimem de cima para baixo**, escalonadas,
terminando no total. Frase de negócio: *"é a conta sendo somada na sua frente."*
`prefers-reduced-motion` → aparece pronta, com os mesmos números.

## 6. Estrutura (Stat-Led, 9 blocos)

1. **Barra de estado** — nome · quantos imóveis estão com a conta aberta · cidade
2. **Hero = um número**, calculado do próprio acervo: *"R$ 390 — é quanto o anúncio esconde, em média, nos 6 imóveis abaixo."*
3. **Controle** — "quanto cabe no seu mês?" (campo + atalhos). Devolve: *"procure aluguel anunciado até ~R$ 1.450"* — porque as pessoas orçam o aluguel, não o total.
4. **Lista** — cada imóvel: anunciado riscado → **total real**. Cabe / estoura com motivo.
5. **A conta** (abre no clique) — linhas com pontilhado, coluna *por lei*, fio duplo, TOTAL.
6. **A foto** — dentro da conta, **depois** do número. Deliberado: a foto é o que todo mundo mostra primeiro.
7. **Entrada** — 1º mês + caução (≤ 3 aluguéis) + vistoria. O número que ninguém publica.
8. **Letra miúda honesta** — art. 22 VIII, art. 37 § único, e o aviso de que empilhar garantias é irregular.
9. **CTA de venda própria** — só aqui, no fim.

## 7. Parâmetros de URL (padrão do portfólio: um por estado)

`?ate=1800` orçamento · `?im=itarare-2q` abre a conta daquele imóvel.
Servem ao painel de demonstração **e** ao link que o corretor manda no WhatsApp.

## 8. Portão de verificação (medido, não olhado)

- [ ] Contraste em RGB resolvido **sobre `--via` (#FFF)**, a superfície mais clara onde os tokens pousam — não sobre o fundo
- [ ] `?ate=` e `?im=` corretos; valor inválido não quebra
- [ ] soma da conta == total exibido (conferida em JS pelo teste, não pelo olho)
- [ ] estado "nada cabe" com motivo
- [ ] 0 pageerror · sem scroll-x em 1440 / 390 / 320
- [ ] `prefers-reduced-motion` mantém os números
- [ ] nenhum hex fora do `:root` · zero token AAPSON

## Adequação MIFB (UI polish)
> Skill `make-interfaces-feel-better` (19 princípios). Receita Zero (index + checkout) já adequado.
> - ⏳ `site-dfy/imobiliaria/index.html` — fase 2 (font-smoothing, tabular-nums, scale-on-press, hit areas)
> - Ver `references/aapson-rollout-plan.md` no skill para detalhes completos
