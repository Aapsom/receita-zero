/**
 * C5 Idempotency Tests — Unified Dunning Engine
 *
 * Ref: PLANO CONJUNTO §2.2 (A-10), [[Spec - C5 Dunning]] §Testes
 *
 * Tests the C5 dunning engine with idempotency guarantees:
 * - 24h/48h retry rule
 * - 3ª falha → ATLAS trigger + subscription suspended
 * - Idempotency: same evento_id → null (no duplicate)
 * - Different evento_id → new tentativa
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calcularProximaAcao,
  processarFalhaDunning,
  zTableSet,
  zTableGet,
  zTableHas,
  zTableClear,
  shouldTriggerAtlas,
  calcularDunningSummary,
  REGRA_DEFAULT,
} from '../src/lib/c5/dunning';
import type { Cobranca, Tentativa } from '../src/lib/c5/dunning';

// ─── Mock Data ────────────────────────────────────────────────────────────

function makeCobranca(overrides: Partial<Cobranca> = {}): Cobranca {
  return {
    id: 'cob_1',
    subscription_id: 'sub_1',
    pme_id: 'pme_1',
    payment_method: 'pix_auto',
    valor: 4900,
    vencimento: new Date().toISOString(),
    status: 'failed',
    tentativa_count: 0,
    ultima_tentativa_em: null,
    prox_cobranca: null,
    ...overrides,
  };
}

function makeTentativa(
  overrides: Partial<Tentativa> = {}
): Tentativa {
  return {
    id: `tent_${Date.now()}`,
    cobranca_id: 'cob_1',
    ts: new Date().toISOString(),
    resultado: 'falha',
    motivo: 'Pagamento falhou',
    evento_id: 'evento_1',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('C5 Dunning Engine', () => {
  beforeEach(() => {
    zTableClear();
  });

  describe('calcularProximaAcao', () => {
    it('1ª falha → retry em 24h', () => {
      const cobranca = makeCobranca();
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha', evento_id: 'evento_1' }),
      ];

      const result = calcularProximaAcao(
        cobranca,
        tentativas,
        REGRA_DEFAULT.pix_auto
      );

      expect(result.acao).toBe('retry');
      expect(result.tentativa_count).toBe(1);
      expect(result.motivo).toContain('1ª falha');
      expect(result.motivo).toContain('24h');
      expect(result.ts).not.toBeNull();

      // Verify ts is ~24h in the future
      const ts = new Date(result.ts!);
      const now = new Date();
      const diffHours = (ts.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThan(25);
    });

    it('2ª falha → retry em 48h', () => {
      const cobranca = makeCobranca();
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha', evento_id: 'evento_1' }),
        makeTentativa({ resultado: 'falha', evento_id: 'evento_2' }),
      ];

      const result = calcularProximaAcao(
        cobranca,
        tentativas,
        REGRA_DEFAULT.pix_auto
      );

      expect(result.acao).toBe('retry');
      expect(result.tentativa_count).toBe(2);
      expect(result.motivo).toContain('2ª falha');
      expect(result.motivo).toContain('48h');
      expect(result.ts).not.toBeNull();

      // Verify ts is ~48h in the future
      const ts = new Date(result.ts!);
      const now = new Date();
      const diffHours = (ts.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(47);
      expect(diffHours).toBeLessThan(49);
    });

    it('3ª falha → ATLAS trigger + subscription suspensa', () => {
      const cobranca = makeCobranca();
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha', evento_id: 'evento_1' }),
        makeTentativa({ resultado: 'falha', evento_id: 'evento_2' }),
        makeTentativa({ resultado: 'falha', evento_id: 'evento_3' }),
      ];

      const result = calcularProximaAcao(
        cobranca,
        tentativas,
        REGRA_DEFAULT.pix_auto
      );

      expect(result.acao).toBe('atlas');
      expect(result.tentativa_count).toBe(3);
      expect(result.motivo).toContain('3ª falha');
      expect(result.motivo).toContain('ATLAS');
    });

    it('pagamento confirmado → ok', () => {
      const cobranca = makeCobranca({ status: 'active' });
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha', evento_id: 'evento_1' }),
        makeTentativa({ resultado: 'sucesso', evento_id: 'evento_2' }),
      ];

      const result = calcularProximaAcao(
        cobranca,
        tentativas,
        REGRA_DEFAULT.pix_auto
      );

      expect(result.acao).toBe('ok');
      expect(result.ts).toBeNull();
    });

    it('regra customizada de janela', () => {
      const cobranca = makeCobranca();
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha', evento_id: 'evento_1' }),
      ];

      const regraCustom = {
        tipo: 'pix_auto' as const,
        janela_retry_1h: 12,
        janela_retry_2h: 24,
        max_tentativas: 3,
      };

      const result = calcularProximaAcao(cobranca, tentativas, regraCustom);

      expect(result.acao).toBe('retry');
      expect(result.motivo).toContain('12h');

      const ts = new Date(result.ts!);
      const now = new Date();
      const diffHours = (ts.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(11);
      expect(diffHours).toBeLessThan(13);
    });
  });

  describe('processarFalhaDunning', () => {
    it('evento novo gera tentativa', () => {
      const cobranca = makeCobranca();
      const tentativasExistentes: Tentativa[] = [];

      const result = processarFalhaDunning(
        cobranca,
        tentativasExistentes,
        'evento_novo_1',
        'Pagamento falhou'
      );

      expect(result).not.toBeNull();
      expect(result!.tentativa.resultado).toBe('falha');
      expect(result!.tentativa.evento_id).toBe('evento_novo_1');
      expect(result!.proxima_acao.acao).toBe('retry');
      expect(result!.subscription_status).toBe('failed');
      expect(result!.retry_em).not.toBeNull();
    });

    it('eventos diferentes geram tentativas distintas', () => {
      const cobranca = makeCobranca();

      // Primeiro evento
      const result1 = processarFalhaDunning(
        cobranca,
        [],
        'evento_A',
        'Falha 1'
      );

      expect(result1).not.toBeNull();
      expect(result1!.tentativa.evento_id).toBe('evento_A');

      // Segundo evento (diferente)
      const result2 = processarFalhaDunning(
        cobranca,
        [result1!.tentativa],
        'evento_B',
        'Falha 2'
      );

      expect(result2).not.toBeNull();
      expect(result2!.tentativa.evento_id).toBe('evento_B');
      expect(result2!.proxima_acao.tentativa_count).toBe(2);
    });

    it('evento duplicado (mesmo evento_id) retorna null (idempotente)', () => {
      const cobranca = makeCobranca();
      const tentativaExistente = makeTentativa({ evento_id: 'evento_dup' });

      const result = processarFalhaDunning(
        cobranca,
        [tentativaExistente],
        'evento_dup', // mesmo evento_id
        'Falha duplicada'
      );

      expect(result).toBeNull();
    });

    it('3ª falha dispara ATLAS e suspende subscription', () => {
      const cobranca = makeCobranca();

      // 1ª falha
      const r1 = processarFalhaDunning(
        cobranca,
        [],
        'evento_1',
        'Falha 1'
      );
      expect(r1).not.toBeNull();

      // 2ª falha
      const r2 = processarFalhaDunning(
        cobranca,
        [r1!.tentativa],
        'evento_2',
        'Falha 2'
      );
      expect(r2).not.toBeNull();

      // 3ª falha
      const r3 = processarFalhaDunning(
        cobranca,
        [r1!.tentativa, r2!.tentativa],
        'evento_3',
        'Falha 3'
      );

      expect(r3).not.toBeNull();
      expect(r3!.proxima_acao.acao).toBe('atlas');
      expect(r3!.subscription_status).toBe('suspended');
    });
  });

  describe('Z-Table (idempotência)', () => {
    it('zTableHas retorna false para evento não processado', () => {
      expect(zTableHas('evento_novo')).toBe(false);
    });

    it('zTableSet + zTableGet armazena e recupera entrada', () => {
      zTableSet({
        evento_id: 'evento_test',
        subscription_id: 'sub_1',
        cobranca_id: 'cob_1',
        processado_em: new Date().toISOString(),
        tentativa_id: 'tent_1',
        acao: 'retry',
        motivo: '1ª falha',
      });

      expect(zTableHas('evento_test')).toBe(true);
      const entry = zTableGet('evento_test');
      expect(entry).not.toBeUndefined();
      expect(entry!.evento_id).toBe('evento_test');
      expect(entry!.acao).toBe('retry');
    });

    it('zTableClear limpa todas as entradas', () => {
      zTableSet({
        evento_id: 'evento_1',
        subscription_id: 'sub_1',
        cobranca_id: 'cob_1',
        processado_em: new Date().toISOString(),
        tentativa_id: 'tent_1',
        acao: 'retry',
        motivo: 'test',
      });

      expect(zTableHas('evento_1')).toBe(true);

      zTableClear();

      expect(zTableHas('evento_1')).toBe(false);
    });
  });

  describe('shouldTriggerAtlas', () => {
    it('3 falhas consecutivas → true', () => {
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha' }),
        makeTentativa({ resultado: 'falha' }),
        makeTentativa({ resultado: 'falha' }),
      ];

      expect(shouldTriggerAtlas(tentativas)).toBe(true);
    });

    it('2 falhas → false', () => {
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha' }),
        makeTentativa({ resultado: 'falha' }),
      ];

      expect(shouldTriggerAtlas(tentativas)).toBe(false);
    });

    it('falhas intercaladas com sucessos → false (se < 3 falhas)', () => {
      const tentativas: Tentativa[] = [
        makeTentativa({ resultado: 'falha' }),
        makeTentativa({ resultado: 'sucesso' }),
        makeTentativa({ resultado: 'falha' }),
      ];

      expect(shouldTriggerAtlas(tentativas)).toBe(false);
    });
  });

  describe('calcularDunningSummary', () => {
    it('calcula resumo corretamente', () => {
      const cobrancas: Cobranca[] = [
        makeCobranca({ id: 'cob_1', status: 'active' }),
        makeCobranca({ id: 'cob_2', status: 'failed' }),
        makeCobranca({ id: 'cob_3', status: 'grace' }),
        makeCobranca({ id: 'cob_4', status: 'suspended' }),
      ];

      const tentativas: Tentativa[] = [
        makeTentativa({ cobranca_id: 'cob_1', resultado: 'sucesso' }),
        makeTentativa({ cobranca_id: 'cob_2', resultado: 'falha' }),
        makeTentativa({ cobranca_id: 'cob_2', resultado: 'falha' }),
      ];

      const summary = calcularDunningSummary(cobrancas, tentativas);

      expect(summary.total_cobrancas).toBe(4);
      expect(summary.ativas).toBe(1);
      expect(summary.falhas).toBe(1);
      expect(summary.grace).toBe(1);
      expect(summary.suspensas).toBe(1);
      expect(summary.total_tentativas).toBe(3);
      expect(summary.recovery_rate).toBe(33); // 1 sucesso / 3 tentativas
    });

    it('resumo vazio', () => {
      const summary = calcularDunningSummary([], []);

      expect(summary.total_cobrancas).toBe(0);
      expect(summary.ativas).toBe(0);
      expect(summary.falhas).toBe(0);
      expect(summary.recovery_rate).toBe(0);
    });
  });
});
