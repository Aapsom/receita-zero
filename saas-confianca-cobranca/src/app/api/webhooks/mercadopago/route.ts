/**
 * MP Webhook Handler — Normalizes MP → C5 webhook with HMAC validation.
 *
 * Ref: PLANO CONJUNTO §2.2 (A-3), §7 (Webhook contract)
 *
 * Flow:
 * 1. Valida assinatura HMAC do MP
 * 2. Normaliza evento (MP → C5 format)
 * 3. Idempotência: webhook_event garante replay não duplica
 * 4. Processa falha via C5 dunning
 * 5. Atualiza subscription status
 * 6. Cria partida em aberto / livro-razão
 * 7. Se 3ª falha → dispara ATLAS trigger
 * 8. Encaminha evento para Vitrine Certa (subscription.activated, etc.)
 *
 * Webhook contract (Avança → Vitrine Certa):
 * - subscription.activated
 * - subscription.failed
 * - payment.confirmed
 * - subscription.suspended
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingRouter } from '@/lib/billing/router';
import { processarFalhaDunning, zTableSet, zTableHas } from '@/lib/c5/dunning';
import {
  WebhookEvent,
  SubscriptionStatus,
  PaymentMethod,
} from '@/lib/billing/types';

// ─── Mock Supabase (in-memory for testing) ───────────────────────────────

interface MockRow {
  [key: string]: unknown;
}

interface MockFilter {
  col: string;
  op: string;
  val: unknown;
}

interface MockQuery {
  _table: string;
  _filters: MockFilter[];
  _select: string;
  _order: { col: string; asc: boolean } | null;
  _limit: number | null;
  _single: boolean;
  _maybeSingle: boolean;
}

// Mock data store
const mockStore: Record<string, MockRow[]> = {
  webhook_event: [],
  subscriptions: [],
  partidas_abertas: [],
  livro_razao: [],
  tentativas: [],
};

// ─── Mock Supabase Client ────────────────────────────────────────────────

class MockSupabaseClient {
  from(table: string): any {
    return {
      _table: table,
      _filters: [] as MockFilter[],
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

      in(col: string, vals: unknown[]) {
        this._filters.push({ col, op: 'in', val: vals });
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
        // Store update data — applied in then() after filters are set via .eq()
        (this as Record<string, unknown>)._updateData = data;
        return this;
      },

      upsert(data: MockRow | MockRow[]) {
        const rows = Array.isArray(data) ? data : [data];
        const table = mockStore[this._table] || [];
        for (const row of rows) {
          const idx = table.findIndex(
            (r) => r.id === row.id || r.evento_id === row.evento_id
          );
          if (idx >= 0) {
            table[idx] = { ...table[idx], ...row };
          } else {
            table.push(row);
          }
        }
        mockStore[this._table] = table;
        return Promise.resolve({ data: rows, error: null });
      },

      async then(resolve: (val: { data: MockRow[] | MockRow | null; error: unknown }) => void) {
        const table = mockStore[this._table] || [];
        const filtered = this._applyFilters(table);

        // Apply update data if this is an update() call
        const updateData = (this as Record<string, unknown>)._updateData;
        if (updateData && typeof updateData === 'object') {
          for (const row of filtered) {
            Object.assign(row, updateData);
          }
        }

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
            const filterVal = f.val;

            switch (f.op) {
              case 'eq':
                // FIXED: proper equality check (was buggy with ?? precedence)
                return String(rowVal ?? '') === String(filterVal);
              case 'neq':
                return String(rowVal ?? '') !== String(filterVal);
              case 'in':
                return Array.isArray(filterVal) && filterVal.includes(rowVal);
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

  // ─── RPC (for stored procedures) ────────────────────────────────────────
  rpc(name: string, params?: Record<string, unknown>) {
    return Promise.resolve({ data: null, error: null });
  }
}

const supabase = new MockSupabaseClient();

// ─── Helper: extract evento_id from MP webhook ────────────────────────────

function extractEventoId(payload: Record<string, unknown>): string {
  const action = (payload.action as string) || '';
  const data = payload.data as Record<string, unknown> | undefined;
  const dataId = (data?.id as string) || '';

  return `${action}_${dataId}`;
}

// ─── Helper: normalize MP event type ──────────────────────────────────────

function normalizeEventType(payload: Record<string, unknown>): string {
  const action = (payload.action as string) || '';
  const type = (payload.type as string) || '';

  if (type === 'subscription' || action.includes('subscription')) {
    if (action.includes('activated')) return 'subscription.activated';
    if (action.includes('failed')) return 'subscription.failed';
    if (action.includes('suspended')) return 'subscription.suspended';
    if (action.includes('canceled')) return 'subscription.canceled';
    if (action.includes('updated')) return 'subscription.updated';
  }

  if (type === 'payment' || action.includes('payment')) {
    if (action.includes('confirmed')) return 'payment.confirmed';
    if (action.includes('failed')) return 'payment.failed';
    if (action.includes('pending')) return 'payment.pending';
    if (action.includes('refunded')) return 'payment.refunded';
  }

  return `unknown.${action || type}`;
}

// ─── Helper: status from event type ───────────────────────────────────────

function statusFromEvent(tipo: string): SubscriptionStatus {
  switch (tipo) {
    case 'subscription.activated':
      return 'active';
    case 'subscription.failed':
      return 'failed';
    case 'subscription.suspended':
      return 'suspended';
    case 'subscription.canceled':
      return 'canceled';
    case 'payment.confirmed':
      return 'active';
    case 'payment.failed':
      return 'failed';
    case 'payment.pending':
      return 'pending';
    case 'payment.refunded':
      return 'canceled';
    default:
      return 'pending';
  }
}
// ─── Helper: forward to Vitrine Certa ─────────────────────────────────────

async function forwardToVitrineCerta(event: {
  tipo: string;
  subscription_id: string;
  status: SubscriptionStatus;
  pme_id?: string;
}): Promise<void> {
  const vcWebhookUrl =
    process.env.VITRINE_CERTA_WEBHOOK_URL ||
    'https://vitrine-certa.aapson.dev/api/avanca-webhook';

  try {
    // Timeout de 5s — se Vitrine Certa estiver down, o webhook não deve travar
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(vcWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Avanca-Signature': process.env.AVANCA_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err) {
    console.error('Failed to forward to Vitrine Certa:', err);
  }
}

// ─── Helper: create partida em aberto ─────────────────────────────────────

function createPartidaAberta(
  subscriptionId: string,
  pmeId: string,
  plano: string,
  valor: number,
  vencimento: string,
  paymentMethod: PaymentMethod,
  tenantId: string
) {
  supabase.from('partidas_abertas').insert({
    id: `part_${Date.now()}`,
    tenant_id: tenantId,
    subscription_id: subscriptionId,
    pme_id: pmeId,
    plano,
    valor,
    vencimento,
    dias_vencido: 0,
    status: 'aberta',
    tipo: paymentMethod,
  });
}

// ─── Helper: marcar partida como paga ───────────────────────────────────────

async function marcarPartidaComoPagaI(subscriptionId: string): Promise<void> {
  const { data: partida } = await supabase
    .from('partidas_abertas')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'aberta')
    .maybeSingle();

  if (partida) {
    await supabase
      .from('partidas_abertas')
      .update({ status: 'paga', updated_at: new Date().toISOString() })
      .eq('id', partida.id);
  }
}

// ─── Helper: create livro-razão entry ─────────────────────────────────────

function createLivroRazao(
  subscriptionId: string | null,
  pmeId: string,
  plano: string,
  valor: number,
  data: string,
  tipo: 'receita' | 'despesa' | 'ajuste',
  categoria: string,
  descricao: string,
  tenantId: string
) {
  supabase.from('livro_razao').insert({
    id: `lr_${Date.now()}`,
    tenant_id: tenantId,
    subscription_id: subscriptionId,
    pme_id: pmeId,
    plano,
    valor,
    data,
    tipo,
    categoria,
    descricao,
    status: 'confirmada',
  });
}

// ─── Helper: trigger ATLAS ────────────────────────────────────────────────

async function triggerAtlas(
  subscriptionId: string,
  pmeId: string,
  motivo: string
): Promise<void> {
  const atlasUrl =
    process.env.ATLAS_API_URL || 'http://localhost:3000/api/atlas/dunning-trigger';

  try {
    await fetch(atlasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atlas-Signature': process.env.ATLAS_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
        pme_id: pmeId,
        motivo,
        falhas_consecutivas: 3,
      }),
    });
  } catch (err) {
    console.error('Failed to trigger ATLAS:', err);
  }
}

// ─── POST /api/webhooks/mercadopago ────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    const signature = req.headers.get('X-Signature') || '';
    const mpSignature = req.headers.get('X-MercadoPago-Signature') || '';

    // 1. Valida assinatura HMAC
    const provider = billingRouter.getProviderByName('mercadopago');
    const isValid = await provider.validarWebhookSignature(
      body,
      signature || mpSignature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // 2. Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // 3. Extract evento_id and normalize
    const eventoId = extractEventoId(payload);
    const tipo = normalizeEventType(payload);
    const data = payload.data as Record<string, unknown> | undefined;
    const subscriptionPayload = payload.subscription as Record<string, unknown> | undefined;
    const subscriptionId =
      (data?.id as string) ||
      (subscriptionPayload?.id as string) ||
      '';

    // 4. Idempotência: verifica se evento já foi processado
    const existingEvent = await supabase
      .from('webhook_event')
      .select('*')
      .eq('evento_id', eventoId)
      .maybeSingle()
      .then((r: { data: MockRow | null }) => r.data);

    if (existingEvent) {
      return NextResponse.json(
        { message: 'Event already processed', evento_id: eventoId },
        { status: 200 }
      );
    }

    // 5. Register webhook event (before processing for idempotency)
    const webhookEvent: WebhookEvent = {
      evento_id: eventoId,
      provider: 'mercadopago',
      tipo,
      subscription_id: subscriptionId,
      status: statusFromEvent(tipo),
      payload,
      timestamp: new Date().toISOString(),
    };

    await supabase.from('webhook_event').insert({
      evento_id: eventoId,
      provider: 'mercadopago',
      tipo,
      subscription_id: subscriptionId,
      processado_em: null,
      payload,
      created_at: new Date().toISOString(),
    });

    // 6. Processa falha via C5 dunning
    const status = statusFromEvent(tipo);

    if (status === 'failed' || tipo.includes('failed')) {
      // Busca subscription existente
      const subscription = await supabase
        .from('subscriptions')
        .select('*')
        .eq('provider_subscription_id', subscriptionId)
        .maybeSingle()
        .then((r: { data: MockRow | null }) => r.data);

      if (subscription) {
        // Busca tentativas existentes
        const tentativas = await supabase
          .from('tentativas')
          .select('*')
          .eq('cobranca_id', subscription.id)
          .then((r: { data: MockRow[] }) => r.data || []);

        // Processa falha
        const result = processarFalhaDunning(
          {
            id: subscription.id as string,
            subscription_id: subscription.id as string,
            pme_id: subscription.pme_id as string,
            payment_method: subscription.payment_method as PaymentMethod,
            valor: (subscription as Record<string, unknown>).valor as number || 0,
            vencimento: (subscription as Record<string, unknown>).vencimento as string || new Date().toISOString(),
            status: 'failed',
            tentativa_count: tentativas.length,
          },
          tentativas.map((t: MockRow) => ({
            id: t.id as string,
            cobranca_id: t.cobranca_id as string,
            ts: (t.ts as string) || (t.created_at as string),
            resultado: (t.resultado as 'sucesso' | 'falha') || 'falha',
            motivo: (t.motivo as string) || '',
            evento_id: (t.evento_id as string) || eventoId,
          })),
          eventoId,
          (payload.cause as Record<string, unknown> | undefined)?.description as string ||
            (payload.failure_detail as string) ||
            'Pagamento falhou',
        );

        if (result) {
          // Salva tentativa
          await supabase.from('tentativas').insert({
            id: result.tentativa.id,
            tenant_id: subscription.tenant_id,
            cobranca_id: result.tentativa.cobranca_id,
            tipo: 'email',
            status: 'done',
            motivo: result.tentativa.motivo,
            criado_em: result.tentativa.ts,
            retry_em: result.retry_em,
          });

          // Atualiza subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: result.subscription_status,
              updated_at: new Date().toISOString(),
              prox_cobranca: result.retry_em,
            })
            .eq('id', subscription.id);

          // Se 3ª falha → ATLAS trigger
          if (result.proxima_acao.acao === 'atlas') {
            await triggerAtlas(
              subscription.id as string,
              subscription.pme_id as string,
              result.proxima_acao.motivo
            );
          }
        }
      }
    }

    // 7. Handle payment.confirmed → create partida + livro-razão
    if (tipo === 'payment.confirmed' || tipo === 'subscription.activated') {
      const subscription = await supabase
        .from('subscriptions')
        .select('*')
        .eq('provider_subscription_id', subscriptionId)
        .maybeSingle()
        .then((r: { data: MockRow | null }) => r.data);

      if (subscription) {
        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        // Create livro-razão entry (receita)
        const valor =
          ((subscription as Record<string, unknown>).valor as number) || 0;
        createLivroRazao(
          subscription.id as string,
          subscription.pme_id as string,
          subscription.plano as string,
          valor,
          new Date().toISOString(),
          'receita',
          'assinatura',
          `Pagamento confirmado - ${subscription.plano}`,
          subscription.tenant_id as string
        );

        // Mark partida as paid
        await marcarPartidaComoPagaI(subscription.id);
      }
    }

    // 8. Mark webhook event as processed
    await supabase
      .from('webhook_event')
      .update({ processado_em: new Date().toISOString() })
      .eq('evento_id', eventoId);

    // 9. Forward to Vitrine Certa
    await forwardToVitrineCerta({
      tipo,
      subscription_id: subscriptionId,
      status,
      pme_id: (payload.pme_id as string) || undefined,
    });

    return NextResponse.json(
      {
        message: 'Webhook processed',
        evento_id: eventoId,
        tipo,
        status,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}

// ─── GET /api/webhooks/mercadopago (health check) ──────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      service: 'mercadopago-webhook',
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
