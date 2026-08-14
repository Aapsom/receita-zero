# Fase 3 — Marketplace de Add-ons da Vitrine Certa (spec)

> Produto = ZERO IA (regra AAPSON). Add-ons são determinísticos (não recomendação ML).

## Conceito
A Vitrine Certa vende o site R$0 + add-ons recorrentes (Site Sempre Novinho, Aparecer Google PRO,
Cliente na Porta). O **marketplace** é o catálogo onde o PME escolhe add-ons no checkout,
e o Avança os cobra (já contratado em M5/M9: `extras[]` + `apurarMr`).

## Catálogo (determinístico)
- `site_sempre_novinho` — R$99/mês — regera o site mensalmente.
- `aparecer_google_pro` — R$297/mês — SEO gerenciado.
- `cliente_na_porta` — R$199/mês — Google Meu Negócio gerenciado.

## Binding por tenant (M15 integração)
- `marketplace-addons.js` (dry-run): catálogo + bind por tenant, sem banco.
- O Avança já apura MRR de add-ons (`mr.ts`); a VC só exibe o catálogo.

## Fora de escopo (gate)
- Pagamento real de add-on (requer Avança PRD + cliente real).
- Curadoria/ML de recomendação (proibido por CLAUDE.md do Avança).
