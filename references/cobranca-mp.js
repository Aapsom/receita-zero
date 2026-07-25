#!/usr/bin/env node
/**
 * Vitrine Certa — Cobrança Mercado Pago (S8)
 * =========================================
 * Módulo Node SEM dependência externa (https nativo).
 * Planos (preapproval recorrente): essencial R$49 | premium R$149 | full R$199
 * Pacotes Pix (pagamento único /v1/payments): light R$99 | full R$199
 *
 * Token lido de ~/.secrets/mp-access-token-vitrine (NUNCA logado).
 *
 * CLI:
 *   node references/cobranca-mp.js probe                    # GET read-only (200 esperado)
 *   node references/cobranca-mp.js assinatura <plano> <email> [--dry-run]
 *   node references/cobranca-mp.js pix <pacote> <email> [--dry-run]
 *   node references/cobranca-mp.js status <preapproval_id>
 *
 * ⚠️ POSTs reais criam cobrança de verdade — use --dry-run até ter cliente real.
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_HOST = 'api.mercadopago.com';
const BACK_URL = 'https://receitazero.github.io/receita-zero/receita-zero/';

// Matriz canônica (docs/COBRANCA-MP.md §1 — precificação v2.9/v2.10)
const PLANOS = {
  basico:  { valor: 49.0,  reason: 'Vitrine Certa — Plano Básico (R$49/mês)' },
  plus:    { valor: 99.0,  reason: 'Vitrine Certa — Plano Plus (R$99/mês)' },
  premium: { valor: 149.0, reason: 'Vitrine Certa — Plano Premium (R$149/mês)' },
};
const PACOTES = {
  // Manutenção
  site_novinho_basico:  { valor: 99.0,  titulo: 'Vitrine Certa — Site Sempre Novinho Básico (2 atualizações/mês)' },
  site_novinho_total:   { valor: 199.0, titulo: 'Vitrine Certa — Site Sempre Novinho Ilimitado (+1 melhoria)' },
  // Presença
  aparecer_google_pro:  { valor: 297.0, titulo: 'Vitrine Certa — Aparecer no Google PRO (domínio+GBP+SEO+Insights)' },
  // Tráfego (só setup; mensal é recorrente à parte)
  cliente_na_porta:     { valor: 199.0, titulo: 'Vitrine Certa — Cliente na Porta (gestão Ads, +setup R$299)' },
  // Avulso
  atualizacao_avulsa:   { valor: 29.0,  titulo: 'Vitrine Certa — Atualização avulsa (R$29)' },
};

function lerToken() {
  const p = path.join(os.homedir(), '.secrets', 'mp-access-token-vitrine');
  const t = fs.readFileSync(p, 'utf8').trim();
  if (!t) throw new Error('token vazio em ~/.secrets/mp-access-token-vitrine');
  return t;
}

function req(method, urlPath, body) {
  const token = lerToken();
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request(
      {
        host: API_HOST,
        path: urlPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(buf); } catch (_) { /* texto cru */ }
          resolve({ status: res.statusCode, body: json ?? buf });
        });
      }
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ---------- payloads ----------
function payloadAssinatura(plano, payerEmail, externalRef) {
  const p = PLANOS[plano];
  if (!p) throw new Error(`plano inválido: ${plano} (use ${Object.keys(PLANOS).join('|')})`);
  return {
    reason: p.reason,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: p.valor,
      currency_id: 'BRL',
    },
    payer_email: payerEmail,
    back_url: BACK_URL,
    external_reference: externalRef || `vc-${plano}-${Date.now()}`,
  };
}

function payloadPixPacote(pacote, payerEmail, externalRef) {
  const p = PACOTES[pacote];
  if (!p) throw new Error(`pacote inválido: ${pacote} (use ${Object.keys(PACOTES).join('|')})`);
  return {
    transaction_amount: p.valor,
    description: p.titulo,
    payment_method_id: 'pix',
    payer: { email: payerEmail },
    external_reference: externalRef || `vc-pix-${pacote}-${Date.now()}`,
  };
}

// ---------- API pública do módulo ----------
async function criarAssinatura(plano, payerEmail, opts = {}) {
  const payload = payloadAssinatura(plano, payerEmail, opts.externalRef);
  if (opts.dryRun) {
    console.log('[DRY-RUN] POST /preapproval →');
    console.log(JSON.stringify(payload, null, 2));
    return { dryRun: true, payload };
  }
  return req('POST', '/preapproval', payload);
}

async function criarPixPacote(pacote, payerEmail, opts = {}) {
  const payload = payloadPixPacote(pacote, payerEmail, opts.externalRef);
  if (opts.dryRun) {
    console.log('[DRY-RUN] POST /v1/payments (Pix) →');
    console.log(JSON.stringify(payload, null, 2));
    return { dryRun: true, payload };
  }
  return req('POST', '/v1/payments', payload);
}

async function statusAssinatura(id) {
  return req('GET', `/preapproval/${encodeURIComponent(id)}`);
}

async function probe() {
  const me = await req('GET', '/users/me');
  console.log(`GET /users/me → HTTP ${me.status}` +
    (me.body && me.body.id ? ` (user ${me.body.id}, site ${me.body.site_id})` : ''));
  const search = await req('GET', '/preapproval/search?limit=1');
  const total = search.body && search.body.paging ? search.body.paging.total : '?';
  console.log(`GET /preapproval/search?limit=1 → HTTP ${search.status} (total assinaturas: ${total})`);
  return { users_me: me.status, preapproval_search: search.status };
}

module.exports = { criarAssinatura, criarPixPacote, statusAssinatura, probe, PLANOS, PACOTES };

// ---------- CLI ----------
if (require.main === module) {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const args = argv.filter((a) => a !== '--dry-run');
  const [cmd, a1, a2] = args;

  (async () => {
    switch (cmd) {
      case 'probe': {
        const r = await probe();
        const ok = r.users_me === 200 && r.preapproval_search === 200;
        console.log(ok ? '✅ PROBE_OK (200/200)' : '❌ PROBE_FAIL');
        process.exit(ok ? 0 : 1);
      }
      case 'assinatura': {
        const r = await criarAssinatura(a1, a2 || 'cliente@example.com', { dryRun });
        if (!r.dryRun) console.log(`HTTP ${r.status}`, JSON.stringify(r.body, null, 2));
        break;
      }
      case 'pix': {
        const r = await criarPixPacote(a1, a2 || 'cliente@example.com', { dryRun });
        if (!r.dryRun) console.log(`HTTP ${r.status}`, JSON.stringify(r.body, null, 2));
        break;
      }
      case 'status': {
        const r = await statusAssinatura(a1);
        console.log(`HTTP ${r.status}`, JSON.stringify(r.body, null, 2));
        break;
      }
      default:
        console.log('uso: cobranca-mp.js probe | assinatura <plano> <email> [--dry-run] | pix <pacote> <email> [--dry-run] | status <id>');
        process.exit(2);
    }
  })().catch((e) => {
    console.error('ERRO:', e.message);
    process.exit(1);
  });
}
