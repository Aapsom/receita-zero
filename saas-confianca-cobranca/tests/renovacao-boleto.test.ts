/**
 * Renewal Tests — Boleto/PIX QR Code monthly renewal (10 dias antes)
 *
 * Ref: PLANO CONJUNTO §7.1.2b.7.4 (regra de dunning 10 dias antes)
 *
 * Tests:
 * - renovarCobranca() only applies to boleto/pix_qr (not pix_auto/credit_card)
 * - renovarCobranca() only runs when status = 'active'
 * - renovarCobranca() calls createMpCobranca() via /v1/payments
 * - renovarCobranca() returns boleto_url/qr_code from MP response
 * - renovarCobranca() handles MP API errors gracefully
 * - StubBillingProvider returns mock renewal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MercadoPagoBillingProvider } from '@/lib/billing/mercadopago';
import type { StubBillingProvider } from '@/lib/billing/stub';
import type { Assinatura } from '@/lib/billing/types';

// vi.hoisted: stub env BEFORE module-load
const { stubToken, stubWebhook, stubAvanca } = vi.hoisted(() => ({
  stubToken: 'test-token-renovacao',
  stubWebhook: 'test-webhook-secret',
  stubAvanca: 'http://localhost:3001',
}));

vi.stubEnv('MP_ACCESS_TOKEN', stubToken);
vi.stubEnv('MP_WEBHOOK_SECRET', stubWebhook);
vi.stubEnv('AVANCA_API_URL', stubAvanca);

type FetchCall = { url: string; init: RequestInit };

const calls: FetchCall[] = [];
const queue: { status: number; body: unknown }[] = [];

function enqueue(status: number, body: unknown): void {
  queue.push({ status, body });
}

function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function loadProvider(): Promise<{
  MercadoPagoBillingProvider: typeof MercadoPagoBillingProvider;
}> {
  return await import('../src/lib/billing/mercadopago');
}

async function loadStub(): Promise<{
  StubBillingProvider: typeof StubBillingProvider;
}> {
  return await import('../src/lib/billing/stub');
}

function makeAssinatura(overrides: Partial<Assinatura> = {}): Assinatura {
  return {
    id: 'sub_123',
    pme_id: 'pme_456',
    plano: 'essencial',
    provider: 'mercadopago',
    payment_method: 'boleto',
    status: 'active',
    provider_subscription_id: 'sub_mp_789',
    provider_customer_id: 'cust_mp_012',
    prox_cobranca: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    checkout_url: null,
    authorization_url: null,
    boleto_url: 'https://old.boleto.url',
    qr_code: null,
    qr_code_base64: null,
    vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  calls.length = 0;
  queue.length = 0;

  global.fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (next) {
      return makeResponse(next.status, next.body);
    }
    // Default: customer search returns empty, create returns customer
    if (url.includes('/v1/customers/search')) {
      return makeResponse(200, { results: [] });
    }
    if (url.includes('/v1/customers')) {
      return makeResponse(200, { id: 'cust_mp_real', email: 'pme_456@avanca.com' });
    }
    if (url.includes('/v1/payments')) {
      return makeResponse(200, {
        id: 'pag_123',
        status: 'pending',
        boleto_url: 'https://new.boleto.url',
        qr_code: 'new-qr-code',
        vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    return makeResponse(200, {});
  }) as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renovarCobranca() — MercadoPagoBillingProvider', () => {
  it('should renew boleto subscription successfully', async () => {
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    const assinatura = makeAssinatura({ payment_method: 'boleto' });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(true);
    expect(result.status).toBe('active');
    expect(result.boleto_url).toBe('https://new.boleto.url');
    expect(result.prox_cobranca).toBeTruthy();
  });

  it('should renew pix_qr subscription successfully', async () => {
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    const assinatura = makeAssinatura({
      payment_method: 'pix_qr',
      boleto_url: null,
      qr_code: 'old-qr-code',
    });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(true);
    expect(result.status).toBe('active');
    expect(result.qr_code).toBe('new-qr-code');
  });

  it('should reject pix_auto (not applicable for renewal)', async () => {
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    const assinatura = makeAssinatura({ payment_method: 'pix_auto' });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(false);
    expect(result.message).toContain('não aplicável');
  });

  it('should reject credit_card (not applicable for renewal)', async () => {
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    const assinatura = makeAssinatura({ payment_method: 'credit_card' });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(false);
    expect(result.message).toContain('não aplicável');
  });

  it('should reject non-active subscription', async () => {
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    const assinatura = makeAssinatura({ status: 'suspended' });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(false);
    expect(result.message).toContain('não está ativa');
  });

  it('should handle MP API error gracefully', async () => {
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    // Override fetch to return error on payments endpoint
    (global.fetch as any) = vi.fn(async (url: string) => {
      if (url.includes('/v1/customers/search')) {
        return makeResponse(200, { results: [] });
      }
      if (url.includes('/v1/customers')) {
        return makeResponse(200, { id: 'cust_mp_real', email: 'pme_456@avanca.com' });
      }
      if (url.includes('/v1/payments')) {
        return makeResponse(400, { message: 'Invalid payment_method' });
      }
      return makeResponse(200, {});
    });

    const assinatura = makeAssinatura({ payment_method: 'boleto' });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.message).toContain('Falha na renovação');
  });

  it('should return error when MP_ACCESS_TOKEN not configured', async () => {
    vi.stubEnv('MP_ACCESS_TOKEN', '');
    vi.resetModules();
    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider();

    const assinatura = makeAssinatura();
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(false);
    expect(result.message).toContain('não configurado');

    vi.stubEnv('MP_ACCESS_TOKEN', stubToken);
    vi.resetModules();
    await loadProvider();
  });
});

describe('renovarCobranca() — StubBillingProvider', () => {
  it('should return mock renewal data', async () => {
    const { StubBillingProvider } = await loadStub();
    const provider = new StubBillingProvider();

    const assinatura = makeAssinatura({ payment_method: 'boleto' });
    const result = await provider.renovarCobranca(assinatura);

    expect(result.success).toBe(true);
    expect(result.status).toBe('active');
    expect(result.boleto_url).toContain('mock.mercadopago.com');
    expect(result.qr_code).toContain('mock');
    expect(result.prox_cobranca).toBeTruthy();
  });
});
