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
| 1 | Checkout | `hml/checkout.html` | ✅ | vc-checkout (estável) | ENTREGUE (`e16100c`) |
| 2 | Dashboard (assinaturas) | `hml/dashboard.html` | ✅ | subscriptions?demo=1 | ENTREGUE (`d0ca026`) |
| 3 | Login | `hml/login.html` | ✅ | demo e-mail | ENTREGUE (`e1de825`) |
| 4 | Cadastro do cliente | — | ❌ | Supabase auth real | A FAZER |
| 5 | Detalhe/edição da assinatura | `hml/site.html?cobranca_id=` | ✅ | subscriptions?demo=1 | ENTREGUE (08/ago) |
| 6 | Webhook receiver (P9) | `hml/webhook.html` | ❌ | vc-webhook-receiver (Avança) | A FAZER (backend pronto) |
| 7 | Dashboard de Insights | — | ❌ | Looker/Clarity embed | A FAZER (só doc `DASHBOARD-INSIGHTS.md`) |
| 8 | Política LGPD / Privacidade | `hml/lgpd.html` | ✅ | — | ENTREGUE (08/ago) |
| 9 | Sucesso pós-pagamento | `hml/sucesso.html` | ✅ | — | ENTREGUE (08/ago) |
| 10 | Recuperação de senha / conta | — | ❌ | auth real | A FAZER |

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
