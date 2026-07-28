/**
 * Livro Razão — Contabilidade por trás (partidas a receber).
 *
 * Ref: PLANO CONJUNTO §2.2 (A-7)
 *
 * Gerencia o livro-razão para controle de receitas e despesas.
 * Cada entrada é uma partida contábil (débito ou crédito).
 */

// ─── Types ───────────────────────────────────────────────────────────────

export type TipoPartida = 'receita' | 'despesa' | 'ajuste';
export type StatusPartida = 'confirmada' | 'pendente' | 'estornada';

export interface PartidaContabil {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  pme_id: string;
  plano: string;
  valor: number;
  data: string; // ISO date
  tipo: TipoPartida;
  categoria: string;
  descricao: string;
  status: StatusPartida;
  created_at: string;
}

export interface LivroResumo {
  total_receita: number;
  total_despesa: number;
  saldo: number;
  receitas_confirmadas: number;
  receitas_pendentes: number;
  despesas_confirmadas: number;
  ajustes: number;
}

export interface LivroFiltro {
  tenant_id?: string;
  data_inicio?: string;
  data_fim?: string;
  tipo?: TipoPartida;
  categoria?: string;
  status?: StatusPartida;
  pme_id?: string;
}

// ─── Mock Store ───────────────────────────────────────────────────────────

const livroStore: PartidaContabil[] = [];

// ─── CRUD ──────────────────────────────────────────────────────────────────

/**
 * Cria uma entrada no livro-razão.
 */
export function criarPartidaContabil(
  input: Omit<PartidaContabil, 'id' | 'created_at'>
): PartidaContabil {
  const partida: PartidaContabil = {
    ...input,
    id: `lr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };

  livroStore.push(partida);
  return partida;
}

/**
 * Busca partidas no livro-razão com filtros.
 */
export function buscarPartidas(
  filtro: LivroFiltro
): PartidaContabil[] {
  let result = [...livroStore];

  if (filtro.tenant_id) {
    result = result.filter((p) => p.tenant_id === filtro.tenant_id);
  }
  if (filtro.data_inicio) {
    result = result.filter((p) => p.data >= filtro.data_inicio!);
  }
  if (filtro.data_fim) {
    result = result.filter((p) => p.data <= filtro.data_fim!);
  }
  if (filtro.tipo) {
    result = result.filter((p) => p.tipo === filtro.tipo);
  }
  if (filtro.categoria) {
    result = result.filter((p) => p.categoria === filtro.categoria);
  }
  if (filtro.status) {
    result = result.filter((p) => p.status === filtro.status);
  }
  if (filtro.pme_id) {
    result = result.filter((p) => p.pme_id === filtro.pme_id);
  }

  return result.sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Busca partidas por subscription.
 */
export function buscarPorSubscription(
  subscriptionId: string
): PartidaContabil[] {
  return livroStore
    .filter((p) => p.subscription_id === subscriptionId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Calcula resumo do livro-razão para um tenant.
 */
export function calcularResumo(tenantId: string): LivroResumo {
  const partidas = livroStore.filter((p) => p.tenant_id === tenantId);

  const totalReceita = partidas
    .filter((p) => p.tipo === 'receita')
    .reduce((sum, p) => sum + p.valor, 0);

  const totalDespesa = partidas
    .filter((p) => p.tipo === 'despesa')
    .reduce((sum, p) => sum + p.valor, 0);

  const receitasConfirmadas = partidas
    .filter((p) => p.tipo === 'receita' && p.status === 'confirmada')
    .reduce((sum, p) => sum + p.valor, 0);

  const receitasPendentes = partidas
    .filter((p) => p.tipo === 'receita' && p.status === 'pendente')
    .reduce((sum, p) => sum + p.valor, 0);

  const despesasConfirmadas = partidas
    .filter((p) => p.tipo === 'despesa' && p.status === 'confirmada')
    .reduce((sum, p) => sum + p.valor, 0);

  const ajustes = partidas
    .filter((p) => p.tipo === 'ajuste')
    .reduce((sum, p) => sum + p.valor, 0);

  return {
    total_receita: totalReceita,
    total_despesa: totalDespesa,
    saldo: totalReceita - totalDespesa,
    receitas_confirmadas: receitasConfirmadas,
    receitas_pendentes: receitasPendentes,
    despesas_confirmadas: despesasConfirmadas,
    ajustes,
  };
}

/**
 * Estorna uma partida (marca como estornada).
 */
export function estornarPartida(partidaId: string): PartidaContabil | null {
  const idx = livroStore.findIndex((p) => p.id === partidaId);
  if (idx < 0) return null;

  livroStore[idx] = {
    ...livroStore[idx],
    status: 'estornada',
  };

  return livroStore[idx];
}

/**
 * Limpa o store (para testes).
 */
export function clearLivroRazao(): void {
  livroStore.length = 0;
}
