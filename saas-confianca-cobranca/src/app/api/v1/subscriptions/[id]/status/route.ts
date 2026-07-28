/**
 * GET /api/v1/subscriptions/:id/status
 *
 * Ref: PLANO CONJUNTO §7.1.2b.4 (Site offline)
 *
 * Used by Vitrine Certa middleware to check subscription status.
 * Returns 200 if active, 503 if suspended/canceled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingRouter } from '@/lib/billing/router';

// ─── Mock Store (sync with subscriptions API) ────────────────────────────

interface MockRow {
  [key: string]: unknown;
}

const mockStore: Record<string, MockRow[]> = {
  subscriptions: [],
};

// ─── GET /api/v1/subscriptions/:id/status ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

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

    // 2. Find subscription
    const subscription = mockStore.subscriptions.find(
      (s) => s.id === id || s.provider_subscription_id === id
    );

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const status = subscription.status as string;

    // 3. Determine HTTP status
    let httpStatus = 200;
    if (status === 'suspended' || status === 'canceled') {
      httpStatus = 503;
    }

    // 4. Return status
    return NextResponse.json(
      {
        subscription_id: subscription.id,
        pme_id: subscription.pme_id,
        plano: subscription.plano,
        status,
        payment_method: subscription.payment_method,
        prox_cobranca: subscription.prox_cobranca,
        suspended: status === 'suspended' || status === 'canceled',
      },
      { status: httpStatus }
    );
  } catch (err) {
    console.error('GET /api/v1/subscriptions/:id/status error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
