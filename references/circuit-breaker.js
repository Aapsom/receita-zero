#!/usr/bin/env node
/**
 * circuit-breaker.js — M8: timeout/circuit breaker Avanca<->VC (logica pura).
 * Fecha apos N falhas consecutivas; abre (bloqueia) por janela; meio-aberto testa recuperacao.
 *   node references/circuit-breaker.js [--falhas N] [--janela MS]
 */
'use strict';

function criarBreaker({ falhasParaAbrir = 3, janelaMs = 2000 } = {}) {
  let estado = 'fechado';
  let falhas = 0;
  let abertoEm = 0;
  return {
    estado: () => estado,
    chamar(fn) {
      const agora = Date.now();
      if (estado === 'aberto' && agora - abertoEm < janelaMs) {
        const e = new Error('circuit OPEN'); e.open = true; throw e;
      }
      if (estado === 'aberto' && agora - abertoEm >= janelaMs) estado = 'meio-aberto';
      try {
        const r = fn();
        if (estado !== 'fechado') estado = 'fechado';
        falhas = 0;
        return r;
      } catch (e) {
        falhas++;
        if (falhas >= falhasParaAbrir) { estado = 'aberto'; abertoEm = agora; }
        throw e;
      }
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--falhas');
  const falhasAntesDeOk = i >= 0 ? parseInt(args[i + 1], 10) : 3;
  const janelaMs = 120;
  const breaker = criarBreaker({ falhasParaAbrir: 3, janelaMs });
  let tentativa = 0, recuperou = false, abriu = false;
  // fase 1: forca abertura (3 falhas consecutivas)
  for (let t = 0; t < 3; t++) {
    try {
      breaker.chamar(() => { tentativa++; if (tentativa <= falhasAntesDeOk) throw new Error('VC 503'); return true; });
    } catch (e) { if (breaker.estado() === 'aberto') abriu = true; console.error(`❌ ${e.message} (estado=${breaker.estado()})`); }
  }
  // fase 2: espera janela (half-open) e recupera
  await sleep(janelaMs + 30);
  try {
    const r = breaker.chamar(() => true);
    recuperou = r === true;
    console.log(`✅ chamada ok (estado=${breaker.estado()})`);
  } catch (e) {
    console.error(`❌ ${e.message} (estado=${breaker.estado()})`);
  }
  const ok = recuperou && breaker.estado() === 'fechado' && abriu;
  console.log(ok ? '✅ CIRCUIT_BREAKER_OK (abriu e recuperou)' : '❌ CIRCUIT_BREAKER_FAIL');
  process.exit(ok ? 0 : 1);
}
if (require.main === module) main();
