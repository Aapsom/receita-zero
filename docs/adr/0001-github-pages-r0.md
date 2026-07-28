# 0001 — GitHub Pages estático R$0 em vez de hosting pago/CMS

Status: aceita

## Contexto
A frente Receita-Zero tem regra dura de custo R$0 e precisa publicar dezenas de vitrines de PME.

## Decisão
Todos os sites são estáticos, hospedados em GitHub Pages (org Receitazero), sem backend próprio. SEO/analytics instrumentados de forma estática.

## Consequências
+ Custo zero, deploy por git push, escala trivial de N sites.
− Sem lógica server-side: funcionalidades dinâmicas (leads, cobrança) delegadas a integrações externas (Apps Script/ATLAS/Avança).
