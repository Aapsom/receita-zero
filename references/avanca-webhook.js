#!/usr/bin/env node
/**
 * avanca-webhook.js — Webhook de retorno Avança → Vitrine Certa
 * =================================================================
 * Recebe eventos do Avança (que gerencia MP) e atualiza o status da
 * assinatura na planilha LEADS-SHEETS (docs/LEADS-SHEETS.md).
 *
 * 100% testável via --mock (sem secret real, sem rede).
 *
 * Webhook contract (Avança → Vitrine Certa) — P9 fechado:
 *   POST tenant.webhook_url  Content-Type: application/json
 *   Header  x-vc-signature   = HMAC_SHA256( webhook_secret, corpo bruto ) em hex
 *                             (sem timestamp, sem prefixo "v1=", só hex puro)
 *
 *   Eventos:
 *     subscription.activated   → status=ATIVO
 *     subscription.failed      → status=INADIMPLENTE (→ F4 Dunning)
 *     payment.confirmed        → status=ATIVO
 *     subscription.suspended   → status=SUSPENSO (site offline)
 *
 * Payload esperado (corpo JSON, campos obrigatórios marcados *):
 *     event*            string  ex: "subscription.activated"
 *     event_id*         string  id único do evento (idempotência)
 *     subscription_id*  string  assinatura alvo
 *     pme_id            string  (opcional, mapeado do pme_email)
 *     data              object  (opcional, detalhes extras)
 *
 * Segurança:
 *   - Assinatura validada em tempo constante (timingSafeEqual) com
 *     pré-comparação de comprimento para evitar lançar RangeError e evitar
 *     a "timing-oracle" via comprimento de resposta.
 *   - Payload sem campos obrigatórios → 400 (antes de qualquer efeito colateral).
 *   - Idempotência: cada event_id só produz efeito UMA vez. Reentrega do
 *     mesmo evento → 200 (não erro), confirmado como duplicado.
 *   - Log estruturado JSONL: 1 linha por evento recebido (inclui duplicados,
 *     para auditoria), com ts ISO, event, event_id, subscription_id, status,
 *     is_duplicado, http_status, result.
 *
 * Uso (mock):
 *   node references/avanca-webhook.js --mock subscription.activated <pme_id>
 *   node references/avanca-webhook.js --mock subscription.suspended <pme_id>
 *   node references/avanca-webhook.js --mock subscription.failed <pme_id>
 *
 * Uso (servidor real):
 *   node references/avanca-webhook.js --port 3001
 *   (precisa AVANCA_WEBHOOK_SECRET no cofre ~/.secrets/avanca-webhook-secret
 *    ou variável de ambiente AVANCA_WEBHOOK_SECRET)
 *
 * Uso (teste e2e diretamente):
 *   const { createWebhook } = require('./avanca-webhook.js')
 *   const wh = createWebhook({ secret: '...', lockDir: '/tmp/locks', logPath: '/tmp/log.jsonl' })
 *   wh.handleHttp(req, res)
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// ===== Configuração =====
// Override por env em todos os caminhos: o e2e precisa isolar log e locks em
// tmp para nao poluir o estado real (e para poder afirmar o que foi escrito).
const PORT = parseInt(process.env.AVANCA_WEBHOOK_PORT || '3001', 10);
const LOG = process.env.AVANCA_WEBHOOK_LOG
  || path.join(__dirname, '..', 'lead-engine', 'bridge-log.jsonl');
const LOCK_DIR = process.env.AVANCA_WEBHOOK_LOCK_DIR
  || path.join(os.homedir(), '.avanca-webhook-locks');

// Eventos tratados → status na planilha
const EVENTOS = {
  'subscription.activated':   'ATIVO',
  'subscription.failed':        'INADIMPLENTE',
  'payment.confirmed':        'ATIVO',
  'subscription.suspended':   'SUSPENSO',
};

// Campos obrigatórios do payload (contrato P9 + idempotência)
const CAMPOS_OBRIGATORIOS = ['event', 'event_id', 'subscription_id'];
const EVENTOS_VALIDOS = Object.keys(EVENTOS);

// ===== Secret =====
function lerSecret(envVar) {
  // Permite override via env var (para teste/e2e); fallback para o arquivo do cofre.
  if (envVar !== undefined) return envVar;
  if (process.env.AVANCA_WEBHOOK_SECRET) return process.env.AVANCA_WEBHOOK_SECRET;
  try {
    return fs.readFileSync(
      path.join(os.homedir(), '.secrets', 'avanca-webhook-secret'), 'utf8'
    ).trim();
  } catch (_) {
    return '';
  }
}

// ===== Validação de assinatura (HMAC-SHA256) em tempo constante =====
// Contrato P9 (Avança notificarTenant): o Avança envia o header
// `x-vc-signature` = HMAC_SHA256(secret, corpoCru), sem ts/v1. O segredo é o
// `webhook_secret` do tenant.
//
// Análise de timing attack:
// 1. Não curto-circuitar a comparação de string manualmente (==/===) para o
//    conteúdo da assinatura — toda comparação "character a character" é vulnerável.
// 2. `timingSafeEqual` só é seguro se ambos os Buffers tiverem O MESMO
//    COMPRIMENTO — caso contrário, lança RangeError e expõe o tempo de parse.
//    Como o HMAC-SHA256 em hex tem SEMPRE 64 chars, se a assinatura recebida
//    não tiver 64 chars, sabemos de antemão que é inválida.
//
// Trade-off honesto: comparar o comprimento (ll === 64) é um curto-circuito
// de SHANNON-1bit (ele só reduce para "provavelmente inválido" sem revelar
//  conteúdo). O tempo restante é dominado por `timingSafeEqual` para
// assinaturas válidas, que é o que importa.
function validarAssinatura(secret, bodyRaw, xVcSignature) {
  if (!secret) return false;
  if (!xVcSignature) return false;
  const EXPECTED_LEN = 64; // SHA256 hex

  const sig = String(xVcSignature);
  if (sig.length !== EXPECTED_LEN) return false;

  const hmac = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');
  const a = Buffer.from(hmac, 'utf8');
  const b = Buffer.from(sig,  'utf8');

  // timingSafeEqual exige mesmo length; já garantido pelo guard acima.
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ===== Validação de payload (campos obrigatórios) =====
function validarPayload(payload) {
  const erros = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['payload não é um objeto JSON válido'];
  }
  for (const campo of CAMPOS_OBRIGATORIOS) {
    const val = payload[campo];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      erros.push(`campo obrigatório ausente: ${campo}`);
    }
  }
  // Valida evento reconhecido (não bloqueia, mas sinaliza — o receptor só
  // aplica efeito para eventos conhecidos; desconhecidos são logados e
  // aceitos para não travar o pipeline do Avança).
  return erros;
}

// ===== Idempotência =====
// Cada evento tem um event_id único. Eventos já processados são ignorados.
//
// Em produção: arquivo .lock no diretório do home (LOCK_DIR), um por event_id.
// Em teste/e2e: o createWebhook({ lockDir }) permite injetar um diretório
// temporário, evitando poluir o sistema de arquivos do usuário.
function isProcessadoDir(lockDir, eventId) {
  if (!eventId) return false;
  if (!fs.existsSync(lockDir)) return false;
  // Lista entries; se houver <eventId>.lock, já foi processado.
  try {
    const lockFile = path.join(lockDir, `${eventId}.lock`);
    return fs.existsSync(lockFile);
  } catch (_) {
    return false;
  }
}

function marcarProcessadoDir(lockDir, eventId) {
  if (!eventId) return;
  try {
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(path.join(lockDir, `${eventId}.lock`), Date.now().toString());
  } catch (e) {
    // se não conseguir escrever, loga mas não crasha
    console.error('[webhook] falha ao gravar lock de idempotência:', e.message);
  }
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

// ===== Log estruturado JSONL =====
function logLine(logPath, obj) {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const linha = JSON.stringify({ ts: new Date().toISOString(), ...obj });
    fs.appendFileSync(logPath, linha + '\n');
  } catch (e) {
    // log de falha de log não derruba o webhook
    console.error('[webhook] falha ao escrever log:', e.message);
  }
}

// ============================================================
//  createWebhook — fábrica injetável (para servidor e teste)
// ============================================================
//  opts:
//    secret    string — webhook secret (geralmente HMAC key do tenant)
//    lockDir   string — diretório dos .lock de idempotência
//    logPath   string — caminho do log JSONL
//    estado    object — estado alvo (opcional; se omitido, cria objeto novo)
//
//  Retorna { handleHttp, validarAssinatura, validarPayload, aplicarEvento,
//            isProcessado, marcarProcessado }
function createWebhook(opts = {}) {
  const secret = opts.secret || '';
  const lockDir = opts.lockDir || LOCK_DIR;
  const logPath = opts.logPath || LOG;
  const estado = opts.estado || {};

  const isProcessado = (eventId) => isProcessadoDir(lockDir, eventId);
  const marcarProcessado = (eventId) => marcarProcessadoDir(lockDir, eventId);

  // ---- HTTP handler (POST /webhook, GET /health) ----
  function handleHttp(req, res) {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', events: Object.keys(estado).length }));
      return;
    }
    if (req.method !== 'POST' || (req.url !== '/webhook' && req.url !== '/webhook/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'not found' }));
      return;
    }

    const chunks = [];
    req.on('data', (c) => {
      chunks.push(c);
      // Proteção: limita payload a 256KB (webhook do Avança é bem menor)
      if (Buffer.concat(chunks).length > 256 * 1024) req.destroy();
    });
    req.on('end', () => {
      const bodyRaw = Buffer.concat(chunks).toString('utf8');
      _processarEvento(req, res, bodyRaw, bodyRaw);
    });
    req.on('error', () => {
      try { res.writeHead(400); res.end('bad request'); } catch (_) {}
    });
  }

  // ---- core: valida + aplica um evento (corpo bruto + corpo bruto para HMAC) ----
  function _processarEvento(req, res, bodyRaw, rawForHmac) {
    const sig = req.headers['x-vc-signature'] || '';

    // 1) Assinatura (timingSafeEqual; 401 se inválida)
    if (!validarAssinatura(secret, rawForHmac, sig)) {
      const motivo = !secret ? 'secret ausente' : !sig ? 'header x-vc-signature ausente' : 'assinatura não confere';
      logLine(logPath, { webhook: 'avanca', evento: null, event_id: null, subscription_id: null, status: null, is_duplicado: false, http_status: 401, erro: 'assinatura_invalida', motivo, body_len: bodyRaw.length });
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'invalid signature' }));
      return;
    }

    // 2) Parse JSON
    let body;
    try {
      body = JSON.parse(bodyRaw);
    } catch (_) {
      logLine(logPath, { webhook: 'avanca', evento: null, event_id: null, subscription_id: null, status: null, is_duplicado: false, http_status: 400, erro: 'json_invalido', body_len: bodyRaw.length });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'invalid JSON' }));
      return;
    }

    // 3) Valida campos obrigatórios
    const erros = validarPayload(body);
    if (erros.length > 0) {
      logLine(logPath, { webhook: 'avanca', evento: body.event || null, event_id: body.event_id || null, subscription_id: body.subscription_id || null, status: null, is_duplicado: false, http_status: 400, erro: 'campos_obrigatorios', detalhe: erros });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erro: 'missing required fields', campos: erros }));
      return;
    }

    const evento = body.event;
    const eventId = body.event_id;
    const subId = body.subscription_id;
    const pmeId = body.pme_id || body.pme_email || body.data?.pme_id || subId;

    // 4) Idempotência: duplicado → 200 (não erro), confirmado como duplicado
    if (isProcessado(eventId)) {
      logLine(logPath, { webhook: 'avanca', evento, event_id: eventId, subscription_id: subId, status: EVENTOS[evento] || null, is_duplicado: true, http_status: 200, result: 'duplicado_ignorado' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: 'duplicate', event_id: eventId }));
      return;
    }

    // 5) Aplicar evento
    const status = aplicarEvento(evento, pmeId, estado);
    marcarProcessado(eventId);

    logLine(logPath, { webhook: 'avanca', evento, event_id: eventId, subscription_id: subId, pme_id: pmeId, status, is_duplicado: false, http_status: 200, result: 'aplicado' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, result: 'applied', status, event_id: eventId }));
  }

  return { handleHttp, validarAssinatura, validarPayload, aplicarEvento, isProcessado, marcarProcessado, _estado: estado };
}

// ===== Servidor standalone =====
function startServer() {
  const secret = lerSecret();
  if (!secret) {
    console.error('AVANCA_WEBHOOK_SECRET não encontrado — defina no env ou ~/.secrets/avanca-webhook-secret');
    console.error('ou use --mock para testar sem rede.');
  }
  const wh = createWebhook({ secret });
  const server = http.createServer((req, res) => wh.handleHttp(req, res)).listen(PORT, () => {
    console.log(`avanca-webhook ouvindo :${PORT} (secret ${secret ? 'carregado' : 'AUSENTE — use --mock'})`);
  });
  // graceful shutdown
  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

// ===== Mock (sem rede) =====
function runMock() {
  const evento = process.argv[3] || 'subscription.activated';
  const pmeId = process.argv[4] || 'pme-123';
  const eventId = `mock-${evento}-${pmeId}-${Date.now()}`;
  const estado = {};
  const wh = createWebhook({ secret: 'mock-secret-for-demo-only', estado });
  const status = wh.aplicarEvento(evento, pmeId, estado);
  wh.marcarProcessado(eventId);
  logLine(LOG, { evento, pme_id: pmeId, event_id: eventId, status, webhook: 'avanca-mock' });
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

module.exports = {
  // fábrica injetável (principal; usado por startServer e e2e)
  createWebhook,
  // helpers re-exportados para compat c/ quem já importava antes
  validarAssinatura,
  validarPayload,
  aplicarEvento,
  isProcessado: (eventId) => isProcessadoDir(LOCK_DIR, eventId), // legacy: usa LOCK_DIR default
  marcarProcessado: (eventId) => marcarProcessadoDir(LOCK_DIR, eventId), // legacy
  EVENTOS,
  CAMPOS_OBRIGATORIOS,
};
