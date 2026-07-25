# Vitrine Certa — Cobrança Mercado Pago (GATE 5=B) · APROFUNDADO Mês 2 / Semana 6

> **Status:** desenho de integração **completo**. Secrets NÃO existem ainda → a
> implementação de código fica travada no **GATE 👤 de execução** (só o CEO deposita
> `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` no cofre). Nada aqui toca em secret.
> Alinhado à precificação canônica (`vitrine-certa-precificacao`).

---

## 1. Matriz de cobrança (canônica — fonte da verdade)

### 1.1 Planos mensais (assinatura recorrente — `preapproval`)

| Plano | Valor | Tipo MP | O que inclui |
|-------|-------|---------|--------------|
| **Básico** | R$49/mês | `preapproval` | Site + WhatsApp + já aparece no Google + relatório básico de visualizações |
| **Plus** | R$99/mês | `preapproval` | Básico + acabamento premium + motion + seção "como funciona" |
| **Premium** | R$149/mês | `preapproval` | Plus + mecânica única do nicho + pedido/agenda |

### 1.2 Pacotes de add (assinatura recorrente — cross-sell, oferecidos 30d depois)

| Pacote | Valor | Tipo MP | O que inclui |
|--------|-------|---------|--------------|
| **Site Sempre Novinho** Básico | R$99/mês | `preapproval` | 2 atualizações de cardápio/fotos por mês |
| **Site Sempre Novinho** Ilimitado | R$199/mês | `preapproval` | Atualizações ilimitadas + 1 melhoria/mês |
| **Aparecer no Google PRO** | R$297/mês | `preapproval` | Domínio + GBP + SEO local + Insights completo (bundle) |
| **Cliente na Porta** | R$199/mês + R$299 setup | `preapproval` + `preference` | Gestão Google/Meta Ads (verba à parte) |

### 1.3 Avulsos (pagamento único — `preference` + Pix)

| Item | Valor | Tipo MP |
|------|-------|---------|
| Atualização avulsa (R$29) | R$29/un | `preference` (Pix + cartão) |
| Melhoria de layout | R$79–R$199 | `preference` |
| Correção de bug | **grátis** | — (não gera cobrança) |

---

## 2. Fluxo de cobrança recorrente (ponta a ponta)

```
Lead aprova proposta
   │
   ▼
[1] Hermes cria preapproval MP (plano escolhido)   ──▶  link de assinatura
   │                                                      (Pix recorrente / cartão)
   ▼
[2] Cliente paga 1ª cobrança  ──▶  MP dispara webhook  preapproval.authorized
   │
   ▼
[3] mp-webhook.js valida x-signature → marca status=ATIVO na planilha (LEADS-SHEETS)
   │                                   → loga em lead-engine/bridge-log.jsonl
   ▼
[4] Publicação liberada (HITL: só publica após aprovação — GATE 6=A)
   │
   ▼  (ciclos seguintes, automáticos)
[5] MP cobra mês a mês → webhook payment.approved → mantém ATIVO
   │
   └─ payment.rejected / cancelamento → status=INADIMPLENTE
                                        → aciona F4 Dunning (ATLAS, tenant vitrinecerta)
```

- **Recorrência real:** o MP `preapproval` com `auto_recurring.frequency_type:"months"`
  cobra sozinho todo mês. Não há cobrança manual (GATE 5=B satisfeito).
- **Pix recorrente:** MP suporta Pix automático em assinatura (BR-native) — vantagem
  sobre Stripe para o público PME.

---

## 3. Endpoints MP (referência de implementação)

### 3.1 Assinatura (planos + pacotes recorrentes)
```
POST https://api.mercadopago.com/preapproval
Authorization: Bearer $MP_ACCESS_TOKEN
{
  "reason": "Vitrine Certa — Plano Premium",
  "auto_recurring": {
    "frequency": 1, "frequency_type": "months",
    "transaction_amount": 149.00, "currency_id": "BRL"
  },
  "payer_email": "<cliente>",
  "back_url": "https://receitazero.github.io/receita-zero/receita-zero/",
  "external_reference": "<lead_id>"
}
```

### 3.2 Avulso (cardápio R$29, melhorias)
```
POST https://api.mercadopago.com/checkout/preferences
{
  "items": [{ "title": "Atualização de cardápio", "quantity": 1,
              "unit_price": 29.00, "currency_id": "BRL" }],
  "payment_methods": { "excluded_payment_types": [] },
  "external_reference": "<lead_id>",
  "back_urls": { "success": "...", "failure": "...", "pending": "..." }
}
```

### 3.3 Consulta / reconciliação
```
GET /preapproval/{id}          # estado da assinatura
GET /v1/payments/{id}          # estado de um pagamento
```

---

## 4. Webhook de retorno — `references/mp-webhook.js` (a criar quando GATE abrir)

- Reutiliza o padrão testado de `references/sheets-atlas-bridge.js` (rota + `--mock`).
- Passos:
  1. valida `x-signature` (HMAC-SHA256 com `MP_WEBHOOK_SECRET`);
  2. `preapproval.authorized` / `payment.approved` → `status=ATIVO` na planilha + log;
  3. `payment.rejected` / `preapproval.cancelled` → `status=INADIMPLENTE` → F4 Dunning;
  4. idempotência por `payment.id` (não processa o mesmo evento 2×).
- **URL pública:** mesma pendência do bridge (tunnel/VPS ou Cloud Function) — decidir
  com o CEO. Enquanto não houver URL pública, testar 100% via `--mock`.

---

## 5. Secrets (GATE 👤 — NUNCA no repo)

| Secret | Onde |
|--------|------|
| `MP_ACCESS_TOKEN` (produção) | cofre local `C:\Users\kauea\secrets\` (NTFS-hardened) |
| `MP_WEBHOOK_SECRET` | idem |
| `MP_ACCESS_TOKEN_TEST` (sandbox) | idem |

Scripts lêem via `process.env.*`. O cofre fica **FORA** do repo.

---

## 6. Checklist para o CEO destravar (copy-paste)

```
[ ] 1. Criar aplicação no painel Mercado Pago (conta Receita-Zero, NÃO AAPSON)
[ ] 2. Gerar Access Token de PRODUÇÃO + Access Token de TESTE (sandbox)
[ ] 3. Configurar Webhook no painel MP → apontar para a URL pública decidida
[ ] 4. Copiar o "Assinatura de webhook" (secret) do painel
[ ] 5. Depositar MP_ACCESS_TOKEN, MP_ACCESS_TOKEN_TEST, MP_WEBHOOK_SECRET no cofre
[ ] 6. Avisar Hermes → implementa mp-webhook.js + testa sandbox (preapproval R$49 + webhook simulado)
```

Feito isso, o GATE 5 sai de "decisão" (já=B) para "execução liberada" e a cobrança
recorrente entra em produção.

---

## 7. Implementado (S8 — 24/jul) — `references/cobranca-mp.js`

Módulo Node **sem dependência externa** (https nativo). Token lido de
`~/.secrets/mp-access-token-vitrine` (fs, nunca logado).

**API (module.exports):**
- `criarAssinatura(plano, payerEmail, {dryRun, externalRef})` — POST `/preapproval`; planos `essencial` R$49 / `premium` R$149 / `full` R$199
- `criarPixPacote(pacote, payerEmail, {dryRun, externalRef})` — POST `/v1/payments` Pix; pacotes `light` R$99 / `full` R$199
- `statusAssinatura(id)` — GET `/preapproval/{id}`
- `probe()` — GET `/users/me` + `/preapproval/search?limit=1` (read-only)

**CLI:**
```bash
node references/cobranca-mp.js probe                               # sonda read-only
node references/cobranca-mp.js assinatura premium email --dry-run  # imprime payload, NÃO chama API
node references/cobranca-mp.js pix light email --dry-run
node references/cobranca-mp.js status <preapproval_id>
```

**Evidência real (24/jul):** `probe` → `GET /users/me` **HTTP 200** (user 210205808, MLB)
e `GET /preapproval/search?limit=1` **HTTP 200** (0 assinaturas). POSTs testados só em
`--dry-run` — nenhuma cobrança real criada. Pendências: webhook (`mp-webhook.js`, §4)
e 1º cliente real para o 1º POST sem `--dry-run`.

---

## 8. Métricas de cobrança (para o KPI MRR do plano vivo)

| Evento | Onde registra | KPI alimentado |
|--------|---------------|----------------|
| `preapproval.authorized` | planilha `status=ATIVO` | Clientes ativos, MRR |
| `payment.approved` (recorrente) | log | MRR mês a mês |
| `payment.rejected` | F4 Dunning | Churn / inadimplência |

MRR alvo (plano vivo §8): R$149 (M2) → R$745+ (M4). Cada Premium = R$149; cada Light
cross-sell = +R$99; cada Full = R$199.
