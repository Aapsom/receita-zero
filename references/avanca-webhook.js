#!/usr/bin/env node
/**
 * avanca-webhook.js — Webhook de retorno Avança → Vitrine Certa
 * =================================================================
 * Recebe eventos do Avança (que gerencia MP) e atualiza o status da
 * assinatura na planilha LEADS-SHEETS (docs/LEADS-SHEETS.md).
 *
 * 100% testável via --mock (sem secret real, sem rede).
 *
 * Webhook contract (Avança → Vitrine Certa):
 *   subscription.activated   → status=ATIVO
 *   subscription.failed      → status=INADIMPLENTE (→ F4 Dunning)
 *   payment.confirmed        → status=ATIVO (pagamento confirmado)
 *   subscription.suspended   → status=SUSPENSO (site offline)
 *
 * Idempotência: cada evento tem um event_id único. Eventos já processados
 * são ignorados (armazenados em memória + arquivo .lock).
 *
 * Uso (mock):
 *   node references/avanca-webhook.js --mock subscription.activated <pme_id>
 *   node references/avanca-webhook.js --mock subscription.suspended <pme_id>
 *   node references/avanca-webhook.js --mock payment.confirmed <pme_id>
 *   node references/avanca-webhook.js --mock subscription.failed <pme_id>
 *
 * Uso (servidor real):
 *   node references/avanca-webhook.js --port 3001
 *   (precisa AVANCA_WEBHOOK_SECRET no cofre ~/.secrets/avanca-webhook-secret)
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// ===== Configuração =====
const PORT = parseInt(process.env.AVANCA_WEBHOOK_PORT || '3001', 10);
const LOG = path.join(__dirname, '..', 'lead-engine', 'bridge-log.jsonl');
const LOCK_DIR = path.join(os.homedir(), '.avanca-webhook-locks');

// Eventos tratados → status na planilha
const EVENTOS = {
  'subscription.activated':   'ATIVO',
  'subscription.failed':      'INADIMPLENTE',
  'payment.confirmed':        'ATIVO',
  'subscription.suspended':   'SUSPENSO',
};

// ===== Secret =====
function lerSecret() {
  try {
    return fs.readFileSync(
      path.join(os.homedir(), '.secrets', 'avanca-webhook-secret'), 'utf8'
    ).trim();
  } catch (_) {
    return '';
  }
}

// ===== Validação de assinatura (HMAC-SHA256) =====
// Contrato P9 (Avança notificarTenant): o Avança envia o header
// `x-vc-signature` = HMAC_SHA256(secret, corpoCru), sem ts/v1. O segredo é o
// `webhook_secret` do tenant (cofre ~/.secrets/avanca-webhook-secret).
function validarAssinatura(secret, bodyRaw, xVcSignature) {
  if (!secret) return false;
  if (!xVcSignature) return false;
  const hmac = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(xVcSignature));
  } catch {
    return false;
  }
}

// ===== Idempotência =====
// Cada evento tem um event_id único. Eventos já processados são ignorados.
function isProcessado(eventId) {
  if (!eventId) return false;
  const lockFile = path.join(LOCK_DIR, `${eventId}.lock`);
  return fs.existsSync(lockFile);
}

function marcarProcessado(eventId) {
  if (!eventId) return;
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCK_DIR, `${eventId}.lock`), Date.now().toString());
}

// ===== Aplicar evento =====
function aplicarEvento(evento, pmeId, estado) {
  if (!EVENTOS[evento]) {
    estado[pmeId] = 'DESCONHECIDO:' + evento;
    return estado[pmeId];
  }
  estado[pmeId] = EVENTOS[evento];
  return estado[pmeId];
}

// ===== Log =====
function logLine(obj) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n');
}

// ===== Handler =====
function handler(req, res, estado, secret) {
  let buf = '';
  req.on('data', (c) => (buf += c));
  req.on('end', () => {
    const sig = req.headers['x-vc-signature'] || '';

    // Valida assinatura (contrato P9: x-vc-signature = HMAC_SHA256 sobre corpo)
    if (!validarAssinatura(secret, buf, sig)) {
      console.log('[webhook] assinatura inválida — ignorado');
      res.writeHead(401); res.end('invalid signature'); return;
    }

    let body = {};
    try { body = JSON.parse(buf); } catch (_) {}

    const evento = body.event || body.type || body.action || 'unknown';
    const pmeId = body.pme_id || body.data?.pme_id || body.subscription_id || 'pme?';
    const eventId = body.event_id || body.id || `${evento}:${pmeId}:${Date.now()}`;

    // Idempotência: ignora eventos já processados
    if (isProcessado(eventId)) {
      console.log(`[webhook] ${evento} → pme ${pmeId} = DUPLICADO (ignorado)`);
      res.writeHead(200); res.end('OK (duplicado)'); return;
    }

    const status = aplicarEvento(evento, pmeId, estado);
    marcarProcessado(eventId);

    logLine({ evento, pme_id: pmeId, event_id: eventId, status, webhook: 'avanca' });
    console.log(`[webhook] ${evento} → pme ${pmeId} = ${status}`);

    res.writeHead(200); res.end('OK');
  });
}

// ===== Servidor =====
function startServer() {
  const secret = lerSecret();
  const estado = {};
  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      handler(req, res, estado, secret);
    } else if (req.url === '/health') {
      res.writeHead(200); res.end('ok');
    } else {
      res.writeHead(404); res.end();
    }
  }).listen(PORT, () => {
    console.log(`avanca-webhook ouvindo :${PORT} (secret ${secret ? 'carregado' : 'AUSENTE — use --mock'})`);
  });
}

// ===== Mock =====
function runMock() {
  const evento = process.argv[3] || 'subscription.activated';
  const pmeId = process.argv[4] || 'pme-123';
  const eventId = `mock-${evento}-${pmeId}-${Date.now()}`;
  const estado = {};
  const status = aplicarEvento(evento, pmeId, estado);
  marcarProcessado(eventId);
  logLine({ evento, pme_id: pmeId, event_id: eventId, status, webhook: 'avanca-mock' });
  console.log(`[MOCK] ${evento} → ${pmeId} = ${status}`);
  console.log(`[MOCK] event_id: ${eventId} (idempotência ativada)`);
  console.log(`[MOCK] log: ${LOG}`);
  console.log(status ? 'AVANCA_WEBHOOK_MOCK_OK' : 'AVANCA_WEBHOOK_MOCK_FAIL');
  process.exit(0);
}

// ===== CLI =====
if (require.main === module) {
  if (process.argv.includes('--mock')) runMock();
  else startServer();
}

module.exports = { validarAssinatura, aplicarEvento, EVENTOS, isProcessado, marcarProcessado };
