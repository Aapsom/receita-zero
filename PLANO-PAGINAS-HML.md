# Plano Vivo — Páginas do Portal Vitrine Certa (HML)

> Fonte de verdade do portal do cliente (checkout / login / dashboard / edição).
> Backend: Avança (P8/P9) em URL estável de produção `https://saas-confianca-cobranca.vercel.app`
> (envs = Sandbox + MP teste; ver `.env.sandbox.example`).
> Design system: TODAS as páginas são FILHAS da landing `receita-zero/index.html`
> (3 camadas de fundo: halo `body::before` + spotlight `#spot` + grão `body::after`;
> vidro profundo `color-mix(branco 46-60%)` + `backdrop-filter:blur(16px)` + inset highlight;
> reveal por clip-path; tokens `--accent/--accent-ink` lâmpada + `--disp` Space Grotesk ss01 + `--mono` tnum).

## Status das páginas

| # | Página | Arquivo | Design premium | Backend | Estado |
|---|--------|---------|:---:|:---:|---|
| 1 | Checkout | `hml/checkout.html` | ✅ | vc-checkout (estável) | ENTREGUE · refeito 09/ago (sem campo e-mail; lê conta do localStorage) |
| 2 | Dashboard (assinaturas) | `hml/dashboard.html` | ✅ | subscriptions?demo=1 | ENTREGUE (`d0ca026`) |
| 3 | Login | `hml/login.html` | ✅ | demo e-mail | ENTREGUE (`e1de825`) |
| 4 | Cadastro do cliente | `hml/cadastro.html` | ✅ | demo (localStorage) | ENTREGUE (09/ago) |
| 5 | Detalhe/edição da assinatura | `hml/site.html?cobranca_id=` | ✅ | subscriptions?demo=1 | ENTREGUE (08/ago) |
| 6 | Webhook receiver (P9) | `hml/webhook.html` | ✅ | vc-webhook-receiver (Avança) | ENTREGUE (09/ago, demo) |
| 7 | Dashboard de Insights | `hml/insights.html` | ✅ | Clarity/F7 embed (demo) | ENTREGUE (09/ago) |
| 8 | Política LGPD / Privacidade | `hml/lgpd.html` | ✅ | — | ENTREGUE (08/ago) |
| 9 | Sucesso pós-pagamento | `hml/sucesso.html` | ✅ | — | ENTREGUE (08/ago) |
| 10 | Recuperação de senha / conta | `hml/recuperacao.html` | ✅ | demo (link por e-mail) | ENTREGUE (09/ago) |
| 11 | Termos de Uso | `hml/termos.html` | ✅ | — | ENTREGUE (09/ago) |
| 12 | Cancelamento (self-service) | `hml/cancelamento.html` | ✅ | demo | ENTREGUE (09/ago) |
| 13 | Suporte / Contato | `hml/suporte.html` | ✅ | WhatsApp/e-mail (demo) | ENTREGUE (09/ago) |
| 14 | Portal do Parceiro (revenda WL) | `hml/parceiro.html` | ✅ | — | ENTREGUE (09/ago) |
| 15 | Status do serviço | `hml/status.html` | ✅ | demo | ENTREGUE (09/ago) |
| 16 | Comparar planos (pública) | `hml/planos.html` | ✅ | demo | ENTREGUE (09/ago) |

## Ordem de execução (definida 08/ago)

1. **login.html** — aplicar padrão premium (3 camadas + vidro + reveal) — mantém modo demo.
2. **site.html** (detalhe/edição da assinatura) — lista a cobrança (`?cobranca_id=`), mostra status/próxima cobrança, botões editar conteúdo / cancelar / upgrade, com design premium.
3. **sucesso.html** — página de confirmação pós-pagamento (substitui o 404 do `/checkout/sucesso`).
4. **lgpd.html** — política de privacidade estática (obrigatória).
5. (Depois, se houver auth real) **cadastro.html** + **webhook.html** + **insights embed**.

## Verificação
- Cada página: `node -e` parse do `<script>` + presença das 3 camadas + E2E contra URL estável.
- Commits no `main` do `Receitazero/receita-zero`.
- Aprovação visual do dono no navegador (GitHub Pages) antes de marcar "fechado".

## Páginas que FALTAM no ecossistema (gap real — fora do portal de login)

O portal do cliente (HML) está **100% completo**: 16 telas, todas com design Vitrine Certa +
reveal robusto (checkout/login/cadastro/dashboard/site/sucesso/recuperação/webhook/insights/
lgpd/termos/cancelamento/suporte/parceiro/status/planos). Não resta nenhuma tela de página.

**Plano de Experiência do Cliente (CX):** `docs/PLANO-EXPERIENCIA-CLIENTE.md` — mapa de jornada
(aquisição→conta→suporte/legal→crescimento), princípios de UX fundamentados em skills do GitHub
(addyosmani/agent-skills `frontend-ui-engineering` + `accessibility-checklist`; open-design-agent
`quality-gates`; jony-ux-agent), anti-padrões evitados e checklist de verificação por tela.

**GAP de BACKEND (não de página):** `site.html` (detalhe/edição) e `dashboard.html` ainda usam
`?demo=1`. Auth real (Supabase) NÃO existe — cadastro/login são modo demonstração. Até o auth
real, as telas 4/5 operam só em HML. Próximo passo de engenharia = ligar Supabase auth.
