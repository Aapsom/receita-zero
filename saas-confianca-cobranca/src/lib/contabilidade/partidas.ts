/**
 * Partidas em Aberto — Contas a receber em aberto.
 *
 * Ref: PLANO CONJUNTO §2.2 (A-6), §7.1.2b.4 (Site offline)
 *
 * Gerencia partidas em aberto para o dashboard PME e site offline.
 * Quando uma partida está vencida há 3 dias, o site do PME entra em modo suspenso (503).
 */

import { PaymentMethod } from '../billing/types';

// ─── Types ───────────────────────────────────────────────────────────────

export type PartidaStatus = 'aberta' | 'vencida' | 'paga' | 'cancelada';

export interface Partida {
  id: string;
  tenant_id: string;
  subscription_id: string;
  pme_id: string;
  plano: string;
  valor: number;
  vencimento: string; // ISO date
  dias_vencido: number;
  status: PartidaStatus;
  tipo: PaymentMethod;
  created_at: string;
  updated_at: string;
}

export interface PartidaSummary {
  total: number;
  total_valor: number;
  abertas: number;
  vencidas: number;
  paga: number;
  canceladas: number;
  vencidas_hoje: number;
  vencidas_3_dias: number; // para site offline
}

// ─── Mock Store ───────────────────────────────────────────────────────────

const partidasStore: Partida[] = [];

// ─── Helper: calculate dias_vencido ───────────────────────────────────────

function calcularDiasVencido(vencimento: string): number {
  const venc = new Date(vencimento);
  const now = new Date();
  const diffMs = now.getTime() - venc.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ─── Helper: update status based on vencimento ────────────────────────────

function atualizarStatus(partida: Partida): Partida {
  const dias = calcularDiasVencido(partida.vencimento);

  if (partida.status === 'paga' || partida.status === 'cancelada') {
    return partida;
  }

  if (dias > 0) {
    return { ...partida, status: 'vencida', dias_vencido: dias };
  }

  return { ...partida, status: 'aberta', dias_vencido: 0 };
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

/**
 * Cria uma partida em aberto.
 */
export function criarPartida(
  input: Omit<Partida, 'id' | 'dias_vencido' | 'created_at' | 'updated_at'>
): Partida {
  const now = new Date().toISOString();
  const partida: Partida = {
    ...input,
    id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dias_vencido: 0,
    created_at: now,
    updated_at: now,
  };

  partidasStore.push(partida);
  return partida;
}

/**
 * Busca partidas por tenant.
 */
export function buscarPartidas(tenantId: string): Partida[] {
  return partidasStore
    .filter((p) => p.tenant_id === tenantId)
    .map(atualizarStatus)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/**
 * Busca partidas por PME.
 */
export function buscarPartidasPorPme(pmeId: string): Partida[] {
  return partidasStore
    .filter((p) => p.pme_id === pmeId)
    .map(atualizarStatus)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/**
 * Busca partida por subscription.
 */
export function buscarPartidaPorSubscription(
  subscriptionId: string
): Partida | undefined {
  return partidasStore.find(
    (p) => p.subscription_id === subscriptionId
  );
}

/**
 * Atualiza status de uma partida.
 */
export function atualizarPartida(
  partidaId: string,
  updates: Partial<Partida>
): Partida | null {
  const idx = partidasStore.findIndex((p) => p.id === partidaId);
  if (idx < 0) return null;

  partidasStore[idx] = {
    ...partidasStore[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return atualizarStatus(partidasStore[idx]);
}

/**
 * Marca partida como paga.
 */
export function marcarComoPagamento(partidaId: string): Partida | null {
  return atualizarPartida(partidaId, { status: 'paga', dias_vencido: 0 });
}

/**
 * Marca partida como cancelada.
 */
export function cancelarPartida(partidaId: string): Partida | null {
  return atualizarPartida(partidaId, { status: 'cancelada' });
}

/**
 * Calcula resumo de partidas para um tenant.
 */
export function calcularResumo(tenantId: string): PartidaSummary {
  const partidas = buscarPartidas(tenantId);

  const total = partidas.length;
  const totalValor = partidas.reduce((sum, p) => sum + p.valor, 0);
  const abertas = partidas.filter((p) => p.status === 'aberta').length;
  const vencidas = partidas.filter((p) => p.status === 'vencida').length;
  const paga = partidas.filter((p) => p.status === 'paga').length;
  const canceladas = partidas.filter((p) => p.status === 'cancelada').length;
  const vencidasHoje = partidas.filter(
    (p) => p.status === 'vencida' && p.dias_vencido === 0
  ).length;
  const vencidas3Dias = partidas.filter(
    (p) => p.status === 'vencida' && p.dias_vencido >= 3
  ).length;

  return {
    total,
    total_valor: totalValor,
    abertas,
    vencidas,
    paga,
    canceladas,
    vencidas_hoje: vencidasHoje,
    vencidas_3_dias: vencidas3Dias,
  };
}

/**
 * Verifica se o site do PME deve estar suspenso (503).
 * Site offline se partida vencida há 3+ dias.
 *
 * Ref: PLANO CONJUNTO §7.1.2b.4 (Site offline)
 */
export function deveSuspenderSite(tenantId: string): boolean {
  const partidas = buscarPartidas(tenantId);
  return partidas.some(
    (p) => p.status === 'vencida' && p.dias_vencido >= 3
  );
}

/**
 * Limpa o store (para testes).
 */
export function clearPartidas(): void {
  partidasStore.length = 0;
}
