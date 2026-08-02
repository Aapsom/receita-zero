# Vitrine Certa — Cobrança Avança (MP Pix Automático + Cartão + Boleto + PIX QR)

> **Status:** implementação **completa** (Sprint 1). Secrets NÃO existem ainda → a
> criação de assinaturas reais fica travada no **GATE 👤 de execução** (só o CEO deposita
> `AVANCA_API_TOKEN`/`AVANCA_WEBHOOK_SECRET` no cofre). Nada aqui toca em secret.
>
> **Princípio arquitetural:** Vitrine Certa NUNCA toca Mercado Pago diretamente.
> Todo acesso a MP passa pelo Avança API (`references/cobranca-avanca.js`).

---

## 1. Matriz de cobrança (canônica — fonte da verdade)

### 1.1 Planos mensais (assinatura recorrente)

| Plano | Valor | Tipo | O que inclui |
|-------|-------|------|--------------|
| **Básico** | R$49/mês | recorrente | Site + WhatsApp + já aparece no Google + relatório básico de visualizações |
| **Plus** | R$99/mês | recorrente | Básico + acabamento premium + motion + seção "como funciona" |
| **Premium** | R$149/mês | recorrente | Plus + mecânica única do nicho + pedido/agenda |

### 1.2 Métodos de pagamento (API contract)

| Método | `payment_method` | Recorrente | Descrição |
|--------|-----------------|------------|-----------|
| **Pix Automático** | `pix_auto` | sim | Cobrança recorrente via Pix automático (BR-native). Sem cartão. |
| **Cartão de Crédito** | `credit_card` | sim | Cartão recorrente (até 12x sem juros). |
| **Boleto Bancário** | `boleto` | sim | Boleto mensal. Pagamento manual. |
| **PIX QR** | `pix_qr` | não | QR Code estático para pagamento único (upsell/cruzamento). |

> **Nota:** Pix Automático e Cartão são os métodos primários para assinaturas recorrentes.
> Boleto é fallback para PMEs que não aceitam débito automático. PIX QR é para
> pagamentos avulsos (ex: atualização de cardápio R$29).

### 1.3 Pacotes de add (cross-sell, oferecidos 30d depois)

| Pacote | Valor | Tipo | O que inclui |
|--------|-------|------|--------------|
| **Site Sempre Novinho** Básico | R$99/mês | recorrente | 2 atualizações de cardápio/fotos por mês |
| **Site Sempre Novinho** Ilimitado | R$199/mês | recorrente | Atualizações ilimitadas + 1 melhoria/mês |
| **Aparecer no Google PRO** | R$297/mês | recorrente | Domínio + GBP + SEO local + Insights completo |
| **Cliente na Porta** | R$199/mês + R$299 setup | recorrente + avulso | Gestão Google/Meta Ads (verba à parte) |

### 1.4 Avulsos (pagamento único — PIX QR)

| Item | Valor | Tipo |
|------|-------|------|
| Atualização avulsa (R$29) | R$29 | `pix_qr` (único) |
| Melhoria de layout | R$79–R$199 | `pix_qr` (único) |
| Correção de bug | **grátis** | — (não gera cobrança) |

---

## 2. Fluxo de cobrança recorrente (ponta a ponta)

```
Lead aprova proposta
   │
   ▼
[1] checkout.html (Vitrine Certa) coleta plano + método de pagamento
   │   → POST /api/v1/subscriptions { plano, pme_id, payment_method }
   │   → references/cobranca-avanca.js (NUNCA toca MP diretamente)
   │
   ▼
[2] Avança API cria assinatura no MP (Pix Auto / Cartão / Boleto)
   │   → retorna subscription_id + redirect_url (se houver)
   │
   ▼
[3] Cliente paga 1ª cobrança → MP dispara webhook para Avança
   │
   ▼
[4] Avança → Vitrine Certa: webhook subscription.activated
   │   → references/avanca-webhook.js valida + marca status=ATIVO
   │   → loga em lead-engine/bridge-log.jsonl
   │
   ▼
[5] Publicação liberada (HITL: só publica após aprovação — GATE 6=A)
   │
   ▼  (ciclos seguintes, automáticos)
[6] Avança cobra mês a mês → webhook payment.confirmed → mantém ATIVO
   │
   └─ subscription.failed / subscription.suspended → status=INADIMPLENTE/SUSPENSO
                                        → aciona F4 Dunning (ATLAS, tenant vitrinecerta)
                                        → site offline middleware retorna 503
```

- **Recorrência real:** o Avança API usa MP `preapproval` com `auto_recurring.frequency_type:"months"`
  para cobrar sozinho todo mês. Não há cobrança manual.
- **Pix recorrente:** MP suporta Pix automático em assinatura (BR-native) — vantagem
  sobre Stripe para o público PME.

---

## 3. API contract (Vitrine Certa → Avança) — ATUALIZADO 02/ago

> **Status 02/ago:** rota `POST /api/v1/subscriptions` **IMPLEMENTADA** no Avança
> (branch `feat/hermes-piloto-vc`). Usa **MP Checkout Pro** — o cliente é redirecionado
> para a **interface do Mercado Pago** (segurança máxima, VC nunca vê dados do cartão/Pix).
> Verificado: 14 testes (provider + rota), tsc 0, build 0.

### 3.1 Criar assinatura (recorrente via Checkout Pro)
```http
POST /api/v1/subscriptions
Authorization: Bearer <AVANCA_SESSION>   // sessao do Avanca (tenant_id na sessao)
Content-Type: application/json

{ "plano": "premium", "pme_id": "pme-123", "payment_method": "pix_auto" }
```
**Resposta (200):**
```json
{
  "subscription_id": "pref-abc123",
  "cobranca_id": "cb-456",
  "status": "pending",
  "redirect_url": "https://mercadopago.com.br/checkout/start?pref_id=pref-abc123",
  "pme_id": "pme-123",
  "plano": "premium",
  "payment_method": "pix_auto"
}
```
> A VC redireciona o cliente para `redirect_url` (interface do MP). O MP autentica e
> cobra. Apos o pagamento, o MP dispara webhook → Avanca marca `cobranca` ativa → avisa a VC (ver §4).

### 3.2 Consultar status
```http
GET /api/v1/subscriptions?cobranca_id=cb-456
Authorization: Bearer <AVANCA_SESSION>
```
**Resposta:** `{ "subscription_id", "status", "cliente", "valor", "vencimento" }`

### 3.3 Métodos de pagamento
O `payment_method` e informativo (pix_auto | credit_card | boleto). O **MP decide** o
metodo real DENTRO da interface do MP (`auto_recurring` + `purpose: wallet_purchase`).
Para Pix Automático recorrente nativo, o app MP precisa de `preapproval` habilitado
(gate de producao do MP); o Checkout Pro cobre cartao recorrente hoje, mesmo `redirect_url`.

### 3.4 Webhook Avança → VC
Inalterado (§4): `subscription.activated` / `payment.confirmed` / `subscription.failed`
/ `subscription.suspended`. O Avança já tem `/api/webhook/mercadopago`.

## 4. Webhook contract (Avança → Vitrine Certa)

### 4.1 Endpoint

```
POST /webhook
Host: <vitrine-certa-webhook-url>
x-signature: ts=<timestamp>,v1=<hmac_sha256>
x-request-id: <unique-request-id>
Content-Type: application/json
```

### 4.2 Eventos tratados

| Evento | `event` | Status na planilha | Ação |
|--------|---------|-------------------|------|
| Assinatura ativada | `subscription.activated` | ATIVO | Libera publicação |
| Pagamento confirmado | `payment.confirmed` | ATIVO | Mantém ativo |
| Assinatura falhou | `subscription.failed` | INADIMPLENTE | F4 Dunning |
| Assinatura suspensa | `subscription.suspended` | SUSPENSO | Site offline (503) |

### 4.3 Payload

```json
{
  "event": "subscription.activated",
  "event_id": "evt_123456",
  "subscription_id": "sub_abc123",
  "pme_id": "pme-12345",
  "plano": "premium",
  "payment_method": "pix_auto",
  "timestamp": "2026-07-26T12:00:00Z"
}
```

### 4.4 Idempotência

Cada evento tem um `event_id` único. Eventos já processados são ignorados
(armazenados em `~/.avanca-webhook-locks/<event_id>.lock`).

---

## 5. Implementação (Sprint 1 — 26/jul/2026)

### 5.1 `references/cobranca-avanca.js`
Módulo Node **sem dependência externa** (https nativo). Token lido de
`~/.secrets/avanca-api-token` (fs, nunca logado).

**API (module.exports):**
- `criarAssinatura(plano, pmeId, paymentMethod, {dryRun})` — POST `/api/v1/subscriptions`
- `consultarStatus(subscriptionId)` — GET `/api/v1/subscriptions/{id}`
- `retry(subscriptionId)` — POST `/api/v1/subscriptions/{id}/retry`
- `webhookFalha(subscriptionId, errorDetail)` — POST `/api/v1/subscriptions/{id}/webhook-falha`
- `probe()` — GET `/health`

**CLI:**
```bash
node references/cobranca-avanca.js probe
node references/cobranca-avanca.js assinatura premium pme-123 pix_auto --dry-run
node references/cobranca-avanca.js status sub_abc123
node references/cobranca-avanca.js retry sub_abc123
```

### 5.2 `references/avanca-webhook.js`
Webhook idempotente (HMAC-SHA256 + event_id). Modos: `--mock` (teste) e `--port` (servidor).

```bash
node references/avanca-webhook.js --mock subscription.activated pme-123
node references/avanca-webhook.js --mock subscription.suspended pme-123
node references/avanca-webhook.js --port 3001
```

### 5.3 `checkout.html`
Página estática com seletor de método (Pix Auto/Cartão/Boleto/PIX QR).
Chama Avança API via `fetch()` (ou proxy server-side em produção).
Brand: green-petroleum `#1C6E6A` + sand `#E0922F`.

### 5.4 `references/site-offline-middleware.js`
Middleware Express que verifica status da assinatura no Avança API e retorna
503 se suspensa. Modos: `middleware()`, `--check <pme_id>`, `--mock`.

---

## 6. Secrets (GATE 👤 — NUNCA no repo)

| Secret | Onde |
|--------|------|
| `AVANCA_API_TOKEN` (produção) | cofre local `~/.secrets/avanca-api-token` (NTFS-hardened) |
| `AVANCA_WEBHOOK_SECRET` | cofre local `~/.secrets/avanca-webhook-secret` |
| `AVANCA_API_URL` (sandbox vs produção) | env var (default: `https://api.avanca.com.br`) |

Scripts lêem via `process.env.*` / `fs.readFileSync`. O cofre fica **FORA** do repo.

---

## 7. Checklist para o CEO destravar (copy-paste)

```
[ ] 1. Definir Avança API URL (sandbox vs produção)
[ ] 2. Gerar API token no painel Avança
[ ] 3. Configurar webhook no painel Avança → apontar para a URL pública decidida
[ ] 4. Copiar o "Webhook secret" do painel Avança
[ ] 5. Depositar AVANCA_API_TOKEN, AVANCA_WEBHOOK_SECRET no cofre
[ ] 6. Avisar Hermes → testa sandbox (assinatura R$49 + webhook simulado)
```

---

## 8. Métricas de cobrança (para o KPI MRR do plano vivo)

| Evento | Onde registra | KPI alimentado |
|--------|---------------|----------------|
| `subscription.activated` | planilha `status=ATIVO` | Clientes ativos, MRR |
| `payment.confirmed` (recorrente) | log | MRR mês a mês |
| `subscription.failed` | F4 Dunning | Churn / inadimplência |
| `subscription.suspended` | site-offline-middleware | Site offline (503) |

MRR alvo (plano vivo §8): R$149 (M2) → R$745+ (M4). Cada Premium = R$149; cada Light
cross-sell = +R$99; cada Full = R$199.

---

## 9. Arquitetura (Vitrine Certa NUNCA toca MP)

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  checkout.html  │────▶│ Avança API   │────▶│ Mercado Pago │
│  (Vitrine Certa)│     │ (references/  │     │ (Pix Auto,   │
│                 │     │  cobranca-   │     │  Cartão,     │
│                 │     │  avanca.js)  │     │  Boleto)     │
└─────────────────┘     └──────────────┘     └──────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Avança → VC      │
                    │ webhook          │
                    │ (avanca-webhook) │
                    └──────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ site-offline-    │
                    │ middleware       │
                    │ (503 se suspenso)│
                    └──────────────────┘
```

- **Vitrine Certa** nunca importa SDK do MP, nunca vê token do MP.
- **Avança** é o único responsável por toda integração com MP.
- **Vitrine Certa** controla: checkout, webhook recebido, site offline.
