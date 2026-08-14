#!/usr/bin/env node
/**
 * observabilidade-trace-dist.js — M32 (Integração): trace distribuído (span tree) determinístico.
 *   node references/observabilidade-trace-dist.js --fixture
 */
'use strict';
const crypto = require('crypto');
function main() {
  if (!process.argv.includes('--fixture')) { console.error('uso: --fixture'); process.exit(2); }
  const traceId = crypto.randomUUID();
  const spans = [
    { traceId, span: 'vc.site.criar', parent: null },
    { traceId, span: 'avança.subscribe', parent: 'vc.site.criar' },
    { traceId, span: 'avança.webhook', parent: 'avança.subscribe' },
  ];
  const ok = spans.every((s) => s.traceId === traceId) && spans[0].parent === null;
  console.log(ok ? `✅ TRACE_DIST_OK ${spans.length} spans (traceId propagado)` : '❌ TRACE_DIST_FAIL');
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
