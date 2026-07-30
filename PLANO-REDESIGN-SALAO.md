# Plano — Salão premium · "O QUE SOBROU DE HOJE"

Terceiro nicho do Vitrine Certa. Antecessores: pizzaria (`14 Narrative Workflow`,
motor = hora) e oficina (`05 Workbench`, motor = consulta por placa).
**Este tem que ser de terceira espécie, não uma variação dos dois.**

---

## 1. Auditoria do arquivo antigo (`_v1-agenda-neon.html`, 187 linhas)

Feita antes de propor qualquer coisa. Achado → evidência → problema:

| # | Achado | Evidência | Problema |
|---|---|---|---|
| 1 | **Vestia a marca da AAPSON** | `--bg:#0B0710` · `--a2:#B15BFF` | `#0B0714` e o violeta Acid Circuit são da AAPSON. O braço Vitrine Certa é **isolado** — isto não é gosto, é a regra de isolamento sendo violada no arquivo entregue. Sozinho já justifica o redesign. |
| 2 | Premium = simples escurecido | simples `#D84A7A` → premium `#FF5FB0` | Mesma matiz, só neon. Sintoma nº 2 da skill. |
| 3 | Motion de template | 5× `translateY` + `IntersectionObserver` + `@keyframes glow` | O "aurora glow" está na lista de proibidos do briefing. |
| 4 | **Mecânica da mesma espécie do simples** | simples: simulador de preço + form "dia e horário preferido" · premium: grade de horários "escolha o seu" | Os dois são **formulário que pergunta**. O premium não faz nada que o simples não faça — só faz mais bonito. Este é o defeito grave. |
| 5 | Rosa = o default do nicho | ambos | Beleza cai em rosa por inércia. Os salões premiados (ver §2) recusam rosa. |

`git mv index.html _v1-agenda-neon.html` — preservado, não apagado.

---

## 2. Referências (só o que abriu de verdade)

| Site | Verificado? | O que faz | Por que funciona | O que eu roubo |
|---|---|---|---|---|
| [marcoambrosi.salon](https://www.marcoambrosi.salon/) (Awwwards HM) | ✅ fetch ok | Preto + **um** acento coral `#DF6C4F`. Estrutura: hero → serviços → equipe → portfólio → contato. Aposta em **vídeo do processo**, não em tabela de preço. | O prêmio não veio da estrutura (que é padrão) — veio de **recusar o rosa** e de mostrar trabalho em vez de anunciar serviço. | (a) **paleta sem rosa**; (b) equipe como seção de peso, não rodapé |
| [cevitxef.com](https://www.cevitxef.com) (Awwwards, categoria Forms) | ❌ **não verificável** — devolveu só a casca (SPA, dois badges de cidade, nenhum CSS) | — | — | nada. Não descrevo o que não abri. |
| Awwwards `/websites/beauty/` | ⚠️ parcial | Os SOTD de beleza de 2025 são de **cosmético** (Deep Beauty, Bridge Beauty), não de salão. Salão só aparece em *honorable mention*. | Diz uma coisa útil: **salão de bairro não tem referência premiada para copiar.** O padrão do nicho é template de WordPress. | liberdade — não há "jeito certo" consagrado a respeitar |

Contraponto honesto: a estrutura do Marco Ambrosi (hero→serviços→equipe→galeria)
é exatamente a que o nosso simples já tem. Copiar o vencedor daria um site bonito
e **igual ao de R$49**. A referência serve à paleta e ao tom, não à arquitetura.

---

## 3. O conceito

### 3.1 A pergunta que a dona responde 20×/dia
"**Tem horário hoje?**" — e atrás dela o problema real do negócio:
**cadeira vazia não volta.** Um buraco de 14:00 numa terça é faturamento que
vence. O salão não sofre de falta de pergunta; sofre de **buraco**.

### 3.2 A mecânica — encaixe, não formulário
O site mostra **o dia das três cadeiras desenhado**, com os blocos ocupados e os
**buracos**. A cliente escolhe o serviço; cada serviço tem **duração real**
(escova 45min, corte 60, coloração 180, luzes 240). O diagrama então acende
**só os buracos onde aquele serviço cabe** e apaga o resto.

- Cabe → clicar no buraco monta o WhatsApp com serviço + profissional + horário + duração.
- **Não cabe em lugar nenhum hoje** → o site diz isso na cara e oferece o primeiro
  encaixe de amanhã. Honestidade é o produto, igual ao "não está incluso" da oficina.

Por que é de **espécie diferente** do simples: o simples *pergunta* quando você quer;
este *responde* onde você cabe. É um problema de encaixe (duração × buraco), não um campo de texto.

Frase de negócio de toda animação: **"é o seu serviço procurando onde cabe."**
A barra-fantasma do tamanho da duração desliza pelos buracos. Se não passar nesse
teste, é efeito, não design.

### 3.3 Macroestrutura — `19 Map/Diagram`
Trio default de beleza/moda = Photographic · Catalogue · Marquee Hero. Os três estão
proibidos aqui: são o que faz todo site de salão ser igual.
**A página é o desenho do dia**, lida no eixo horizontal do tempo — não é uma pilha
de blocos como a pizzaria e a oficina.

| Nicho | Macroestrutura | Motor | Objeto |
|---|---|---|---|
| Pizzaria | 14 Narrative Workflow | hora real | uma casa mudando de estado |
| Oficina | 05 Workbench | consulta por placa | um registro |
| **Salão** | **19 Map/Diagram** | **duração escolhida** | **um dia com buracos** |

---

## 4. Paleta e tipografia

### 4.1 Cor — "a cor da página é a cor do cabelo"
Sem rosa (default do nicho, e o simples já é rosa). Sem violeta (é da AAPSON).
Sem teal (pet, lavanderia, clínica). Sem creme amarelo (pizzaria, padaria).
Base = **argila clara rosada dessaturada**, que nenhum dos 8 usa.

O acento **não é cor de marca: é tom de tintura**. Só um ativo por vez, ≤6% da tela.

| Token | Hex | Papel |
|---|---|---|
| `--papel` | `#F3EBE7` | fundo, argila clara |
| `--papel2` | `#E7DAD4` | superfície/faixa |
| `--linha` | `#D3C1B9` | 1px |
| `--tinta` | `#241A16` | texto e blocos escuros |
| `--fumo` | (a medir) | texto secundário |
| `--claro` | `#FAF6F4` | texto sobre tinta |
| `--acaju` | `#8C2F39` | tom padrão (coloração) |
| `--mel` | `#A9743A` | tom (luzes/mechas) |
| `--platina` | `#7C8794` | tom (loiro/platinado) |

Nenhum outro nicho pode fazer isto — só o salão vende cor. E não se copia de um print,
porque é sistema, não swatch.

### 4.2 Tipografia
| Papel | Fonte | Onde |
|---|---|---|
| O salão fala | **Gloock** (serifa display de alto contraste) | h1, h2, nomes |
| A agenda informa | **DM Sans** (grotesk, algarismos tabulares) | horário, duração, preço |

Nenhuma das duas foi usada nos outros nichos (pizzaria = Instrument; oficina = Archivo
+ IBM Plex Mono). Proibidas: Fraunces (AAPSON), Anton/Inter (queimadas), Playfair/Bodoni
(o default de revista de beleza — cair nelas seria o mesmo erro do rosa).

**Regra semântica:** *serifa = escolha e gente · grotesk tabular = tempo e dinheiro.*
Nunca as duas na mesma frase. É o mesmo **princípio** da pizzaria, com faces diferentes —
declarado aqui de propósito, porque o princípio está certo; o que não pode repetir é a cara.

---

## 5. Wireframe

1. **Barra de estado** — "sexta · 3 encaixes livres · fecha 19:00"
2. **Hero = o dia desenhado** — seletor de serviço + faixa horizontal 09:00–19:00 × 3 cadeiras.
   Buracos que cabem acendem; o resto apaga. Clique → WhatsApp.
   Caso honesto: nada cabe hoje → primeiro encaixe de amanhã.
3. **Quanto tempo leva de verdade** — duração + preço por serviço (é o dado que alimenta o diagrama)
4. **Quem senta na cadeira ao lado** — 3 profissionais, especialidade, cadeira, tempo de casa
5. **O que a gente não faz** — a honestidade do nicho
6. **E se…** — atrasei, desmarquei, não gostei da cor
7. **Retoque** — política escrita, não "satisfação garantida"
8. **Rodapé**
9. **CTA Vitrine Certa** — só aqui, fora do `<main>`

---

## 6. Verificação (gate de entrega)

- Contraste **medido em pixel/`getComputedStyle` resolvido**, na superfície mais clara
  em que o token realmente pousa — foi o bug da oficina (`--aguardando` mentia 1 ponto).
- Playwright: 0 `pageerror`, sem scroll-x de 320 a 1440, `prefers-reduced-motion`.
- Todo estado do diagrama conferido: cabe / não cabe / nada cabe hoje.
- Painel de demonstração `_checkpoint/painel-do-dia.html` com `?agora=` e `?servico=`.
- Dados fictícios marcados `⚠️ DEMO`. Config num bloco só, no topo.

### 6.1 Checklist UI polish (`make-interfaces-feel-better`)

| # | Princípio | Aplicar em | Status |
|---|---|---|---|
| 8 | Font smoothing | `html,body` | ✅ Adicionar `-webkit-font-smoothing:antialiased` |
| 9 | Tabular numbers | `.horario`, `.duracao`, `.preco` | ✅ Já no plano (DM Sans tabular) |
| 10 | Text wrapping | headings, descrições | ✅ `text-wrap:balance` em h1/h2, `text-wrap:pretty` em body |
| 12 | Scale on press | botões de slot, CTA WhatsApp | ✅ `active:scale(.96)` em todos os interativos |
| 14 | Never `transition: all` | botões, slots | ✅ Especificar propriedades exatas |
| 16 | Minimum hit area | slots de horário, botões | ✅ Slots ≥44×44px (touch); botões ≥40×40px |
| 19 | Motion restraint | hover de slots, animação da barra-phantasma | ✅ Hover ≤150ms; barra-phantasma usa `prefers-reduced-motion` |
| 1 | Concentric border-radius | cards de serviço dentro de slots | ✅ `outerRadius = innerRadius + padding` |
| 3 | Shadows for elevation | cards, slots ocupados | ✅ `box-shadow` transparente, não border sólido |
| 11 | Image outlines | fotos da equipe | ✅ `outline:1px solid oklch(0 0 0 / 0.1)` (light) / `oklch(1 0 0 / 0.1)` (dark)
