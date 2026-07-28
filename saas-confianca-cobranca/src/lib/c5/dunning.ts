/**
 * C5 Dunning-on-Failure — Unified recovery engine for Pix Automático + Cartão.
 *
 * Ref: [[Spec - C5 Dunning]] §Fluxo (MVP)
 * - débito falha D0 → retry D+1 (24h) → 2ª falha D+2 (48h)
 * - após 2 falhas → dunning: marca cobranca.status + abre conciliação
 * - 3ª falha → ATLAS Receptionista (ZAPI WhatsApp + Resend email)
 *
 * Princípios:
 * - Regra SIMPLES 24h/48h (não FI-CA enterprise)
 * - ZERO IA: regra determinística pura, fácil de testar
 * - Idempotente: webhook_event garante replay não duplica tentativa
 *
 * Ref: PLANO CONJUNTO §2.2 (A-4)
 */

import { SubscriptionStatus, PaymentMethod } from '../billing/types';

// ─── Types ───────────────────────────────────────────────────────────────

export interface Cobranca {
  id: string;
  subscription_id: string;
  pme_id: string;
  payment_method: PaymentMethod;
  valor: number;
  vencimento: string; // ISO date
  status: SubscriptionStatus;
  tentativa_count: number;
  ultima_tentativa_em?: string | null;
  prox_cobranca?: string | null;
}

export interface Tentativa {
  id: string;
  cobranca_id: string;
  ts: string; // ISO timestamp
  resultado: 'sucesso' | 'falha';
  motivo: string;
  evento_id: string; // for idempotency
}

export type Acao = 'retry' | 'dunning' | 'atlas' | 'ok';

export interface Regra {
  tipo: 'pix_auto' | 'credit_card' | 'boleto' | 'pix_qr';
  janela_retry_1h: number; // hours
  janela_retry_2h: number; // hours
  max_tentativas: number;
}

export interface ProximaAcao {
  acao: Acao;
  ts: string | null; // ISO timestamp for next action
  motivo: string;
  tentativa_count: number;
}

// ─── Default Rules (24h/48h) ─────────────────────────────────────────────

export const REGRA_DEFAULT: Record<PaymentMethod, Regra> = {
  pix_auto: {
    tipo: 'pix_auto',
    janela_retry_1h: 24,
    janela_retry_2h: 48,
    max_tentativas: 3,
  },
  credit_card: {
    tipo: 'credit_card',
    janela_retry_1h: 24,
    janela_retry_2h: 48,
    max_tentativas: 3,
  },
  boleto: {
    tipo: 'boleto',
    janela_retry_1h: 24,
    janela_retry_2h: 48,
    max_tentativas: 3,
  },
  pix_qr: {
    tipo: 'pix_qr',
    janela_retry_1h: 24,
    janela_retry_2h: 48,
    max_tentativas: 3,
  },
};

// ─── Pure Function: calcularProximaAcao ───────────────────────────────────

/**
 * Função PURA — sem IO.
 * Calcula a próxima ação de dunning baseada no estado da cobrança e tentativas.
 *
 * Fluxo:
 * - D0 (1ª falha): retry em 24h
 * - D+1 (2ª falha): retry em 48h
 * - D+2 (3ª falha): ATLAS trigger + suspende subscription
 * - Se sucesso: ok
 *
 * Ref: [[Spec - C5 Dunning]] §Contrato da engine
 */
export function calcularProximaAcao(
  cobranca: Cobranca,
  tentativas: Tentativa[],
  regra: Regra
): ProximaAcao {
  // Se não há falhas, tá tudo ok
  const falhas = tentativas.filter((t) => t.resultado === 'falha');
  const sucessos = tentativas.filter((t) => t.resultado === 'sucesso');

  // Se houve sucesso, não precisa de ação
  if (sucessos.length > 0 && cobranca.status === 'active') {
    return {
      acao: 'ok',
      ts: null,
      motivo: 'Pagamento confirmado',
      tentativa_count: tentativas.length,
    };
  }

  const tentativaCount = falhas.length;

  // 1ª falha: retry em 24h
  if (tentativaCount === 1) {
    const retryTs = new Date(
      Date.now() + regra.janela_retry_1h * 60 * 60 * 1000
    ).toISOString();

    return {
      acao: 'retry',
      ts: retryTs,
      motivo: `1ª falha — retry em ${regra.janela_retry_1h}h`,
      tentativa_count: tentativaCount,
    };
  }

  // 2ª falha: retry em 48h
  if (tentativaCount === 2) {
    const retryTs = new Date(
      Date.now() + regra.janela_retry_2h * 60 * 60 * 1000
    ).toISOString();

    return {
      acao: 'retry',
      ts: retryTs,
      motivo: `2ª falha — retry em ${regra.janela_retry_2h}h`,
      tentativa_count: tentativaCount,
    };
  }

  // 3ª falha: ATLAS trigger + suspende subscription
  if (tentativaCount >= regra.max_tentativas) {
    return {
      acao: 'atlas',
      ts: new Date().toISOString(),
      motivo: `3ª falha — ATLAS Receptionista + subscription suspensa`,
      tentativa_count: tentativaCount,
    };
  }

  // Fallback: retry
  return {
    acao: 'retry',
    ts: new Date(
      Date.now() + regra.janela_retry_1h * 60 * 60 * 1000
    ).toISOString(),
    motivo: 'Fallback — retry',
    tentativa_count: tentativaCount,
  };
}

// ─── Processar Falha de Dunning ───────────────────────────────────────────

/**
 * Processa uma falha de webhook e determina a ação de dunning.
 * Idempotente: se o evento_id já foi processado, retorna null.
 *
 * Ref: [[Spec - C5 Dunning]] §Persistência
 */
export interface ProcessarFalhaResult {
  tentativa: Tentativa;
  proxima_acao: ProximaAcao;
  subscription_status: SubscriptionStatus;
  retry_em: string | null;
}

export function processarFalhaDunning(
  cobranca: Cobranca,
  tentativasExistentes: Tentativa[],
  eventoId: string,
  motivo: string,
  regra: Regra = REGRA_DEFAULT[cobranca.payment_method]
): ProcessarFalhaResult | null {
  // Idempotência: se evento_id já foi processado, retorna null
  const eventoJaProcessado = tentativasExistentes.some(
    (t) => t.evento_id === eventoId
  );

  if (eventoJaProcessado) {
    return null;
  }

  // Cria nova tentativa de falha
  const novaTentativa: Tentativa = {
    id: `tent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cobranca_id: cobranca.id,
    ts: new Date().toISOString(),
    resultado: 'falha',
    motivo,
    evento_id: eventoId,
  };

  const todasTentativas = [...tentativasExistentes, novaTentativa];

  // Calcula próxima ação
  const proximaAcao = calcularProximaAcao(cobranca, todasTentativas, regra);

  // Determina status da subscription
  let subscriptionStatus: SubscriptionStatus;
  let retryEm: string | null = null;

  switch (proximaAcao.acao) {
    case 'retry':
      subscriptionStatus = 'failed';
      retryEm = proximaAcao.ts;
      break;
    case 'dunning':
      subscriptionStatus = 'grace';
      break;
    case 'atlas':
      subscriptionStatus = 'suspended';
      break;
    case 'ok':
      subscriptionStatus = 'active';
      break;
  }

  return {
    tentativa: novaTentativa,
    proxima_acao: proximaAcao,
    subscription_status: subscriptionStatus,
    retry_em: retryEm,
  };
}

// ─── Z-Table (idempotent state) ───────────────────────────────────────────

/**
 * Z-Table: tabela de estado idempotente para dunning.
 * Garante que o mesmo evento não gere duas tentativas.
 *
 * Ref: [[Spec - C5 Dunning]] §Persistência — webhook_event
 */
export interface ZTableEntry {
  evento_id: string;
  subscription_id: string;
  cobranca_id: string;
  processado_em: string;
  tentativa_id: string;
  acao: Acao;
  motivo: string;
}

// In-memory Z-table (em produção, usa webhook_event no Supabase)
const zTable: Map<string, ZTableEntry> = new Map();

export function zTableSet(entry: ZTableEntry): void {
  zTable.set(entry.evento_id, entry);
}

export function zTableGet(eventoId: string): ZTableEntry | undefined {
  return zTable.get(eventoId);
}

export function zTableHas(eventoId: string): boolean {
  return zTable.has(eventoId);
}

export function zTableClear(): void {
  zTable.clear();
}

// ─── ATLAS Trigger ────────────────────────────────────────────────────────

/**
 * Determina se o ATLAS Receptionista deve ser disparado.
 * Dispara após 3 falhas consecutivas.
 */
export function shouldTriggerAtlas(tentativas: Tentativa[]): boolean {
  const falhas = tentativas.filter((t) => t.resultado === 'falha');
  return falhas.length >= 3;
}

// ─── Dunning Summary (para dashboard) ─────────────────────────────────────

export interface DunningSummary {
  total_cobrancas: number;
  ativas: number;
  falhas: number;
  grace: number;
  suspensas: number;
  total_tentativas: number;
  recovery_rate: number; // % recuperados
}

export function calcularDunningSummary(
  cobrancas: Cobranca[],
  tentativas: Tentativa[]
): DunningSummary {
  const totalCobrancas = cobrancas.length;
  const ativas = cobrancas.filter((c) => c.status === 'active').length;
  const falhas = cobrancas.filter((c) => c.status === 'failed').length;
  const grace = cobrancas.filter((c) => c.status === 'grace').length;
  const suspensas = cobrancas.filter((c) => c.status === 'suspended').length;

  const totalTentativas = tentativas.length;
  const sucessos = tentativas.filter((t) => t.resultado === 'sucesso').length;
  const recoveryRate =
    totalTentativas > 0 ? (sucessos / totalTentativas) * 100 : 0;

  return {
    total_cobrancas: totalCobrancas,
    ativas,
    falhas,
    grace,
    suspensas,
    total_tentativas: totalTentativas,
    recovery_rate: Math.round(recoveryRate),
  };
}
