/**
 * Dashboard PME — Status em tempo real.
 *
 * Ref: PLANO CONJUNTO §2.2 (A-9), §7.1.2b.4 (Site offline)
 *
 * Mostra:
 * - Status da assinatura (active/failed/grace/canceled/suspended)
 * - Partidas em aberto
 * - Próxima cobrança
 * - Resumo de contabilidade (livro-razão)
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Mock Data ────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  pme_id: string;
  plano: string;
  provider: string;
  payment_method: string;
  status: string;
  prox_cobranca: string | null;
  created_at: string;
  updated_at: string;
  checkout_url?: string | null;
  authorization_url?: string | null;
  boleto_url?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  vencimento?: string | null;
}

interface Partida {
  id: string;
  subscription_id: string;
  pme_id: string;
  plano: string;
  valor: number;
  vencimento: string;
  dias_vencido: number;
  status: string;
  tipo: string;
}

interface LivroResumo {
  total_receita: number;
  total_despesa: number;
  saldo: number;
}

// ─── Mock Store ───────────────────────────────────────────────────────────

const mockStore: {
  subscriptions: Subscription[];
  partidas_abertas: Partida[];
  livro_razao: { valor: number; tipo: string; status: string }[];
} = {
  subscriptions: [],
  partidas_abertas: [],
  livro_razao: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatCurrency(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor / 100);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-600',
    failed: 'text-red-600',
    grace: 'text-yellow-600',
    canceled: 'text-gray-600',
    suspended: 'text-red-600',
    pending: 'text-blue-600',
  };
  return colors[status] || 'text-gray-600';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativa',
    failed: 'Falhou',
    grace: 'Em carência',
    canceled: 'Cancelada',
    suspended: 'Suspensa',
    pending: 'Pendente',
  };
  return labels[status] || status;
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    pix_auto: 'Pix Automático',
    credit_card: 'Cartão de Crédito',
    boleto: 'Boleto Bancário',
    pix_qr: 'PIX QR Code',
  };
  return labels[method] || method;
}

// ─── Dashboard API Handler ────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authHeader = req.headers.get('Authorization') || '';
    const tenantId = req.headers.get('X-Tenant-Id') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const validTenants = ['vitrine-certa', 'vitrine-certa-dfy', 'saas-confianca'];
    const validTokens = [
      process.env.VITRINE_CERTA_API_TOKEN || '',
      'dev-token-vitrine-certa',
    ];

    if (!validTenants.includes(tenantId) || !validTokens.includes(token)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get pme_id from query
    const { searchParams } = new URL(req.url);
    const pmeId = searchParams.get('pme_id');

    // 3. Fetch subscriptions
    let subscriptions = mockStore.subscriptions;
    if (pmeId) {
      subscriptions = subscriptions.filter((s) => s.pme_id === pmeId);
    }

    // 4. Fetch partidas em aberto
    const partidas = pmeId
      ? mockStore.partidas_abertas.filter((p) => p.pme_id === pmeId)
      : mockStore.partidas_abertas;

    // 5. Calculate livro-razão resumo
    const livroResumo: LivroResumo = {
      total_receita: mockStore.livro_razao
        .filter((lr) => lr.tipo === 'receita' && lr.status === 'confirmada')
        .reduce((sum, lr) => sum + lr.valor, 0),
      total_despesa: mockStore.livro_razao
        .filter((lr) => lr.tipo === 'despesa' && lr.status === 'confirmada')
        .reduce((sum, lr) => sum + lr.valor, 0),
      saldo: 0,
    };
    livroResumo.saldo = livroResumo.total_receita - livroResumo.total_despesa;

    // 6. Calculate summary
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'active'
    ).length;
    const failedSubscriptions = subscriptions.filter(
      (s) => s.status === 'failed' || s.status === 'suspended'
    ).length;
    const graceSubscriptions = subscriptions.filter(
      (s) => s.status === 'grace'
    ).length;

    const totalPartidas = partidas.length;
    const partidasVencidas = partidas.filter(
      (p) => p.status === 'vencida'
    ).length;
    const partidasAVencer = partidas.filter(
      (p) => p.status === 'aberta'
    ).length;
    const totalValorPartidas = partidas.reduce(
      (sum, p) => sum + p.valor,
      0
    );

    // 7. Next payment
    const nextPayment = subscriptions
      .filter((s) => s.prox_cobranca && s.status === 'active')
      .sort(
        (a, b) =>
          new Date(a.prox_cobranca!).getTime() -
          new Date(b.prox_cobranca!).getTime()
      )[0];

    // 8. Return dashboard data
    return NextResponse.json(
      {
        pme_id: pmeId,
        tenant_id: tenantId,
        generated_at: new Date().toISOString(),
        subscription: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          failed: failedSubscriptions,
          grace: graceSubscriptions,
          items: subscriptions.map((s) => ({
            id: s.id,
            plano: s.plano,
            payment_method: s.payment_method,
            payment_method_label: getPaymentMethodLabel(s.payment_method),
            status: s.status,
            status_label: getStatusLabel(s.status),
            status_color: getStatusColor(s.status),
            prox_cobranca: s.prox_cobranca,
            prox_cobranca_formatted: s.prox_cobranca
              ? formatDate(s.prox_cobranca)
              : null,
            checkout_url: s.checkout_url,
            authorization_url: s.authorization_url,
            boleto_url: s.boleto_url,
            qr_code: s.qr_code,
            qr_code_base64: s.qr_code_base64,
            vencimento: s.vencimento,
            vencimento_formatted: s.vencimento
              ? formatDate(s.vencimento)
              : null,
            created_at: s.created_at,
          })),
        },
        partidas_abertas: {
          total: totalPartidas,
          vencidas: partidasVencidas,
          a_vencer: partidasAVencer,
          total_valor: formatCurrency(totalValorPartidas),
          items: partidas.map((p) => ({
            id: p.id,
            subscription_id: p.subscription_id,
            plano: p.plano,
            valor: formatCurrency(p.valor),
            vencimento: formatDate(p.vencimento),
            dias_vencido: p.dias_vencido,
            status: p.status,
            tipo: p.tipo,
          })),
        },
        contabilidade: {
          receita: formatCurrency(livroResumo.total_receita),
          despesa: formatCurrency(livroResumo.total_despesa),
          saldo: formatCurrency(livroResumo.saldo),
        },
        next_payment: nextPayment
          ? {
              subscription_id: nextPayment.id,
              plano: nextPayment.plano,
              prox_cobranca: formatDate(nextPayment.prox_cobranca!),
              payment_method: getPaymentMethodLabel(nextPayment.payment_method),
            }
          : null,
        site_offline: partidas.some(
          (p) => p.status === 'vencida' && p.dias_vencido >= 3
        ),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <html lang="pt-BR">
      <head>
        <title>Dashboard PME — Avança</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </head>
      <body>
        <h1>Dashboard PME</h1>
        <p>Status em tempo real — API em /api/dashboard</p>
      </body>
    </html>
  );
}
