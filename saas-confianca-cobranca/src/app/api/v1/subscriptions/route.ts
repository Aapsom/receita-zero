/**
 * API for Vitrine Certa — POST/GET /api/v1/subscriptions
 *
 * Ref: PLANO CONJUNTO §2.2 (A-8), §7 (API contract)
 *
 * Contract:
 * POST /api/v1/subscriptions
 * { plano, pme_id, payment_method: 'pix_auto' | 'credit_card' | 'boleto' | 'pix_qr' }
 *
 * Auth: Bearer token + X-Tenant-Id header
 * Vitrine Certa calls Avança API, never touches MP directly.
 *
 * Webhook contract (Avança → Vitrine Certa):
 * - subscription.activated
 * - subscription.failed
 * - payment.confirmed
 * - subscription.suspended
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingRouter } from '@/lib/billing/router';
import {
  AssinaturaInput,
  SubscriptionResult,
  SubscriptionStatus,
} from '@/lib/billing/types';

// ─── Auth ─────────────────────────────────────────────────────────────────

const VALID_TENANTS = new Set([
  'vitrine-certa',
  'vitrine-certa-dfy',
  'saas-confianca',
]);

const VALID_TOKENS = new Set([
  process.env.VITRINE_CERTA_API_TOKEN || '',
  'dev-token-vitrine-certa',
]);

function authenticate(req: NextRequest): { tenantId: string; valid: boolean } {
  const authHeader = req.headers.get('Authorization') || '';
  const tenantId = req.headers.get('X-Tenant-Id') || '';

  const token = authHeader.replace(/^Bearer\s+/i, '');

  const validTenant = VALID_TENANTS.has(tenantId);
  const validToken = VALID_TOKENS.has(token);

  return {
    tenantId,
    valid: validTenant && validToken,
  };
}

// ─── Mock Supabase ────────────────────────────────────────────────────────

interface MockRow {
  [key: string]: unknown;
}

const mockStore: Record<string, MockRow[]> = {
  subscriptions: [],
  webhook_event: [],
  partidas_abertas: [],
  livro_razao: [],
};

class MockSupabaseClient {
  from(table: string): any {
    return {
      _table: table,
      _filters: [] as { col: string; op: string; val: unknown }[],
      _select: '*',
      _order: null,
      _limit: null,
      _single: false,
      _maybeSingle: false,

      select(select = '*') {
        this._select = select;
        return this;
      },

      eq(col: string, val: unknown) {
        this._filters.push({ col, op: 'eq', val });
        return this;
      },

      neq(col: string, val: unknown) {
        this._filters.push({ col, op: 'neq', val });
        return this;
      },

      order(col: string, { ascending = true } = {}) {
        this._order = { col, asc: ascending };
        return this;
      },

      limit(n: number) {
        this._limit = n;
        return this;
      },

      single() {
        this._single = true;
        return this;
      },

      maybeSingle() {
        this._maybeSingle = true;
        return this;
      },

      insert(data: MockRow | MockRow[]) {
        const rows = Array.isArray(data) ? data : [data];
        const table = mockStore[this._table] || [];
        table.push(...rows);
        mockStore[this._table] = table;
        return Promise.resolve({ data: rows, error: null });
      },

      update(data: Partial<MockRow>) {
        const table = mockStore[this._table] || [];
        const filtered = this._applyFilters(table);
        for (const row of filtered) {
          Object.assign(row, data);
        }
        return Promise.resolve({ data: filtered, error: null });
      },

      async then(resolve: (val: { data: MockRow[] | MockRow | null; error: unknown }) => void) {
        const table = mockStore[this._table] || [];
        const filtered = this._applyFilters(table);

        let result: MockRow[] | MockRow | null;

        if (this._single) {
          result = filtered[0] || null;
        } else if (this._maybeSingle) {
          result = filtered[0] || null;
        } else {
          result = filtered;
        }

        resolve({ data: result, error: null });
      },

      _applyFilters(rows: MockRow[]): MockRow[] {
        let result = [...rows];

        for (const f of this._filters) {
          result = result.filter((row) => {
            const rowVal = row[f.col];
            switch (f.op) {
              case 'eq':
                return String(rowVal ?? '') === String(f.val);
              case 'neq':
                return String(rowVal ?? '') !== String(f.val);
              default:
                return true;
            }
          });
        }

        if (this._order) {
          result.sort((a, b) => {
            const av = String(a[this._order!.col]);
            const bv = String(b[this._order!.col]);
            if (av === bv) return 0;
            return this._order!.asc ? (av > bv ? 1 : -1) : av > bv ? -1 : 1;
          });
        }

        if (this._limit) {
          result = result.slice(0, this._limit);
        }

        return result;
      },
    };
  }
}

const supabase = new MockSupabaseClient();

// ─── POST /api/v1/subscriptions ────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const { tenantId, valid } = authenticate(req);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 3. Validate input
    const { plano, pme_id, payment_method } = body as {
      plano: string;
      pme_id: string;
      payment_method: string;
    };

    if (!plano || !pme_id || !payment_method) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['plano', 'pme_id', 'payment_method'],
          received: { plano: !!plano, pme_id: !!pme_id, payment_method: !!payment_method },
        },
        { status: 400 }
      );
    }

    const validMethods = ['pix_auto', 'credit_card', 'boleto', 'pix_qr'];
    if (!validMethods.includes(payment_method)) {
      return NextResponse.json(
        {
          error: 'Invalid payment_method',
          valid: validMethods,
          received: payment_method,
        },
        { status: 400 }
      );
    }

    // 4. Create subscription via BillingProviderRouter
    const input: AssinaturaInput = {
      plano,
      pme_id,
      payment_method: payment_method as AssinaturaInput['payment_method'],
      tenant_id: tenantId,
    };

    let result: SubscriptionResult;
    try {
      result = await billingRouter.criarAssinatura(input);
    } catch (err) {
      return NextResponse.json(
        {
          error: 'Failed to create subscription',
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 502 }
      );
    }

    // 5. Persist subscription
    const subscription = result.subscription;
    await supabase.from('subscriptions').insert({
      id: subscription.id,
      pme_id: subscription.pme_id,
      tenant_id: tenantId,
      plano: subscription.plano,
      provider: subscription.provider,
      payment_method: subscription.payment_method,
      status: subscription.status,
      provider_subscription_id: subscription.provider_subscription_id,
      provider_customer_id: subscription.provider_customer_id,
      prox_cobranca: subscription.prox_cobranca,
      checkout_url: subscription.checkout_url,
      authorization_url: subscription.authorization_url,
      boleto_url: subscription.boleto_url,
      qr_code: subscription.qr_code,
      qr_code_base64: subscription.qr_code_base64,
      vencimento: subscription.vencimento,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    });

    // 6. Return result
    return NextResponse.json(
      {
        subscription_id: subscription.id,
        status: subscription.status,
        payment_method: subscription.payment_method,
        requires_redirect: result.requires_redirect,
        redirect_url: result.redirect_url,
        checkout_url: subscription.checkout_url,
        authorization_url: subscription.authorization_url,
        boleto_url: subscription.boleto_url,
        qr_code: subscription.qr_code,
        qr_code_base64: subscription.qr_code_base64,
        vencimento: subscription.vencimento,
        prox_cobranca: subscription.prox_cobranca,
        message: result.message,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/v1/subscriptions error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}

// ─── GET /api/v1/subscriptions ─────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const { tenantId, valid } = authenticate(req);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const pmeId = searchParams.get('pme_id');
    const paymentMethod = searchParams.get('payment_method');
    const status = searchParams.get('status');

    // 3. Query subscriptions
    let query = supabase.from('subscriptions').select('*');

    if (pmeId) {
      query = query.eq('pme_id', pmeId);
    }
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.then((r: { data: MockRow[]; error: unknown }) => r);

    if (error) {
      return NextResponse.json(
        { error: 'Database error', details: String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        subscriptions: data || [],
        count: (data || []).length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('GET /api/v1/subscriptions error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
