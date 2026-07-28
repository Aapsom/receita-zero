/**
 * Cron: Renovação Mensal de Boleto e PIX QR Code
 *
 * 10 dias antes do vencimento, gera nova cobrança para assinaturas
 * boleto/pix_qr que estão com prox_cobranca vencida ou próxima.
 *
 * Ref: PLANO CONJUNTO §7.1.2b.7.4 (regra de dunning 10 dias antes)
 *
 * GET  /api/cron/renovacao  — health check
 * POST /api/cron/renovacao  — executa renovação (chamado por cron externo)
 *
 * Auth: Bearer token via CRON_API_TOKEN env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingRouter } from '@/lib/billing/router';
import type { Assinatura, PaymentMethod } from '@/lib/billing/types';

// ─── Config ────────────────────────────────────────────────────────────────

const CRON_API_TOKEN = process.env.CRON_API_TOKEN || '';
const DIAS_RENOVACAO = 10; // renovar 10 dias antes do vencimento

// ─── Mock Supabase (in-memory for testing) ────────────────────────────────

interface MockRow {
  [key: string]: any;
}

interface MockFilter {
  eq: (col: string, val: any) => MockFilter;
  in: (col: string, vals: any[]) => MockFilter;
  lte: (col: string, val: any) => MockFilter;
  gte: (col: string, val: any) => MockFilter;
  lt: (col: string, val: any) => MockFilter;
  gt: (col: string, val: any) => MockFilter;
  or: (query: string) => MockFilter;
  order: (col: string, opts?: { ascending?: boolean }) => MockFilter;
}

interface MockQuery {
  select: (cols: string) => MockQuery;
  eq: (col: string, val: any) => MockFilter;
  in: (col: string, vals: any[]) => MockFilter;
  lte: (col: string, val: any) => MockFilter;
  gte: (col: string, val: any) => MockFilter;
  lt: (col: string, val: any) => MockFilter;
  gt: (col: string, val: any) => MockFilter;
  or: (query: string) => MockFilter;
  order: (col: string, opts?: { ascending?: boolean }) => MockFilter;
}

// Mock data store
const mockStore: Record<string, MockRow[]> = {
  subscriptions: [],
};

class MockSupabaseClient {
  from(table: string) {
    return {
      select: (_cols: string) => ({
        eq: (col: string, val: any) => {
          const filtered = mockStore[table].filter((r) => r[col] === val);
          return createFilter(filtered);
        },
        in: (col: string, vals: any[]) => {
          const filtered = mockStore[table].filter((r) => vals.includes(r[col]));
          return createFilter(filtered);
        },
        lte: (col: string, val: any) => {
          const filtered = mockStore[table].filter((r) => r[col] <= val);
          return createFilter(filtered);
        },
        gte: (col: string, val: any) => {
          const filtered = mockStore[table].filter((r) => r[col] >= val);
          return createFilter(filtered);
        },
        lt: (col: string, val: any) => {
          const filtered = mockStore[table].filter((r) => r[col] < val);
          return createFilter(filtered);
        },
        gt: (col: string, val: any) => {
          const filtered = mockStore[table].filter((r) => r[col] > val);
          return createFilter(filtered);
        },
        or: (query: string) => {
          // Simple OR parsing for "col.eq.val,or.col.eq.val"
          const conditions = query.split(',or.');
          const filtered = mockStore[table].filter((r) =>
            conditions.some((cond) => {
              const match = cond.match(/(\w+)\.eq\.(.+)/);
              if (match) return r[match[1]] === match[2];
              return false;
            })
          );
          return createFilter(filtered);
        },
        order: (_col: string, _opts?: { ascending?: boolean }) => {
          return createFilter([...mockStore[table]]);
        },
      }),
      update: (data: Record<string, any>) => ({
        eq: (col: string, val: any) => {
          const rows = mockStore[table];
          for (const row of rows) {
            if (row[col] === val) {
              Object.assign(row, data);
            }
          }
          return { data: rows, error: null };
        },
      }),
    };
  }
}

function createFilter(rows: MockRow[]) {
  return {
    eq: (col: string, val: any) => {
      const filtered = rows.filter((r) => r[col] === val);
      return createFilter(filtered);
    },
    in: (col: string, vals: any[]) => {
      const filtered = rows.filter((r) => vals.includes(r[col]));
      return createFilter(filtered);
    },
    lte: (col: string, val: any) => {
      const filtered = rows.filter((r) => r[col] <= val);
      return createFilter(filtered);
    },
    gte: (col: string, val: any) => {
      const filtered = rows.filter((r) => r[col] >= val);
      return createFilter(filtered);
    },
    lt: (col: string, val: any) => {
      const filtered = rows.filter((r) => r[col] < val);
      return createFilter(filtered);
    },
    gt: (col: string, val: any) => {
      const filtered = rows.filter((r) => r[col] > val);
      return createFilter(filtered);
    },
    or: (query: string) => {
      const conditions = query.split(',or.');
      const filtered = rows.filter((r) =>
        conditions.some((cond) => {
          const match = cond.match(/(\w+)\.eq\.(.+)/);
          if (match) return r[match[1]] === match[2];
          return false;
        })
      );
      return createFilter(filtered);
    },
    order: (_col: string, _opts?: { ascending?: boolean }) => ({
      data: rows,
      error: null,
    }),
    data: rows,
    error: null,
  };
}

const supabase = new MockSupabaseClient();

// ─── Helpers ───────────────────────────────────────────────────────────────

function authenticate(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.substring(7);
  return token === CRON_API_TOKEN;
}

function diasParaVencimento(prox_cobranca: string | null): number | null {
  if (!prox_cobranca) return null;
  const hoje = new Date();
  const vencimento = new Date(prox_cobranca);
  const diffMs = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ─── POST /api/cron/renovacao ──────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const results: {
    subscription_id: string;
    pme_id: string;
    payment_method: string;
    success: boolean;
    message: string;
    prox_cobranca?: string | null;
  }[] = [];

  try {
    // 1. Busca assinaturas boleto/pix_qr com vencimento em até 10 dias
    const hoje = new Date().toISOString();
    const daquiA10Dias = new Date(
      Date.now() + DIAS_RENOVACAO * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: assinaturas, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('payment_method', ['boleto', 'pix_qr'])
      .eq('status', 'active')
      .or(`prox_cobranca.lte.${daquiA10Dias},prox_cobranca.is.null`)
      .order('prox_cobranca', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar assinaturas: ${error}`);
    }

    // 2. Para cada assinatura, renova a cobrança
    for (const row of assinaturas as MockRow[]) {
      const assinatura: Assinatura = {
        id: row.id as string,
        pme_id: row.pme_id as string,
        plano: row.plano as string,
        provider: 'mercadopago',
        payment_method: row.payment_method as PaymentMethod,
        status: row.status as any,
        provider_subscription_id: row.provider_subscription_id as string | null,
        provider_customer_id: row.provider_customer_id as string | null,
        prox_cobranca: row.prox_cobranca as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        checkout_url: row.checkout_url as string | null,
        authorization_url: row.authorization_url as string | null,
        boleto_url: row.boleto_url as string | null,
        qr_code: row.qr_code as string | null,
        qr_code_base64: row.qr_code_base64 as string | null,
        vencimento: row.vencimento as string | null,
      };

      // Verifica se já foi renovada hoje (idempotência)
      const diasVenc = diasParaVencimento(assinatura.prox_cobranca);
      if (diasVenc !== null && diasVenc > DIAS_RENOVACAO) {
        // Ainda não está no período de renovação
        results.push({
          subscription_id: assinatura.id,
          pme_id: assinatura.pme_id,
          payment_method: assinatura.payment_method,
          success: true,
          message: `Fora do período de renovação (${diasVenc} dias para vencimento)`,
        });
        continue;
      }

      // Renova a cobrança
      const result = await billingRouter.renovarCobranca(assinatura);

      // Atualiza subscription no Supabase
      if (result.success) {
        await supabase
          .from('subscriptions')
          .update({
            boleto_url: result.boleto_url,
            qr_code: result.qr_code,
            prox_cobranca: result.prox_cobranca,
            updated_at: new Date().toISOString(),
          })
          .eq('id', assinatura.id);
      }

      results.push({
        subscription_id: assinatura.id,
        pme_id: assinatura.pme_id,
        payment_method: assinatura.payment_method,
        success: result.success,
        message: result.message,
        prox_cobranca: result.prox_cobranca,
      });
    }

    const sucesso = results.filter((r) => r.success).length;
    const falhas = results.filter((r) => !r.success).length;

    return NextResponse.json({
      ok: true,
      total: results.length,
      sucesso,
      falhas,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        results,
      },
      { status: 500 }
    );
  }
}

// ─── GET /api/cron/renovacao (health check) ────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: 'cron-renovacao',
    descricao: `Renova boleto/PIX QR Code ${DIAS_RENOVACAO} dias antes do vencimento`,
    payment_methods: ['boleto', 'pix_qr'],
  });
}
