// mp-webhook.js — Webhook de retorno Mercado Pago (Vitrine Certa)
// Valida x-signature (HMAC-SHA256) e marca status na planilha LEADS-SHEETS.
// 100% testavel via --mock (sem secret real, sem rede).
//
// Uso (mock):
//   node references/mp-webhook.js --mock preapproval.authorized <lead_id>
//   node references/mp-webhook.js --mock payment.rejected <lead_id>
// Uso (servidor real):
//   node references/mp-webhook.js --port 3000   (precisa MP_WEBHOOK_SECRET no cofre)
//
// Eventos tratados:
//   preapproval.authorized / payment.approved  -> status=ATIVO
//   payment.rejected / preapproval.cancelled   -> status=INADIMPLENTE (-> F4 Dunning)

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

function lerSecret() {
  try { return fs.readFileSync(path.join(os.homedir(), '.secrets', 'mp-webhook-secret-vitrine'), 'utf8').trim(); }
  catch (_) { return ''; }
}

// x-signature vem como "ts=...,v1=HMAC_SHA256(...)"
function validarAssinatura(secret, bodyRaw, xSignature, xRequestId) {
  if (!secret) return false;
  const ts = (xSignature.match(/ts=([^,]+)/) || [])[1];
  const v1 = (xSignature.match(/v1=([^,]+)/) || [])[1];
  if (!ts || !v1) return false;
  const manifest = `id:${xRequestId || ''};request-id:${xRequestId || ''};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest + bodyRaw).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
}

function aplicarEvento(evento, leadId, estado) {
  // estado = mapa em memoria (mock) ou planilha real
  if (evento === 'preapproval.authorized' || evento === 'payment.approved') estado[leadId] = 'ATIVO';
  else if (evento === 'payment.rejected' || evento === 'preapproval.cancelled') estado[leadId] = 'INADIMPLENTE';
  else estado[leadId] = 'DESCONHECIDO:' + evento;
  return estado[leadId];
}

function handler(req, res, estado, secret) {
  let buf = '';
  req.on('data', (c) => (buf += c));
  req.on('end', () => {
    const sig = req.headers['x-signature'] || '';
    const xid = req.headers['x-request-id'] || '';
    if (!validarAssinatura(secret, buf, sig, xid)) {
      res.writeHead(401); res.end('invalid signature'); return;
    }
    let body = {};
    try { body = JSON.parse(buf); } catch (_) {}
    const ev = body.type || body.action || 'unknown';
    const lead = body.data && body.data.id ? String(body.data.id) : (body.external_reference || 'lead?');
    const status = aplicarEvento(ev, lead, estado);
    console.log(`[webhook] ${ev} -> lead ${lead} = ${status}`);
    res.writeHead(200); res.end('OK');
  });
}

// CLI
if (require.main === module) {
  const raw = process.argv.slice(2);
  const mock = raw.includes('--mock');
  const args = raw.filter((a) => a !== '--mock');
  if (mock) {
    const ev = args[0] || 'preapproval.authorized';
    const lead = args[1] || 'lead-123';
    const estado = {};
    const status = aplicarEvento(ev, lead, estado);
    console.log(`[MOCK] ${ev} -> ${lead} = ${status}`);
    process.exit(0);
  }
  const portI = args.indexOf('--port');
  const port = portI >= 0 ? parseInt(args[portI + 1]) : 3000;
  const secret = lerSecret();
  const estado = {};
  http.createServer((req, res) => handler(req, res, estado, secret)).listen(port, () => {
    console.log(`mp-webhook ouvindo :${port} (secret ${secret ? 'carregado' : 'AUSENTE — use --mock'})`);
  });
}
module.exports = { validarAssinatura, aplicarEvento };
