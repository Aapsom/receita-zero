/**
 * Smoke test — valida a correção do bug do customer_id e do transaction_amount.
 * NÃO chama a API real do MP: mocka `globalThis.fetch`.
 *
 * Cobre:
 *  1. createMpCustomer busca customer existente por email → devolve id real do MP (não pmeId)
 *  2. createMpCustomer cria quando search retorna vazio → devolve id real do MP
 *  3. createMpCustomer recupera de race (search∅ → create falha "already_exist" → re-search)
 *  4. createMpSubscription envia transaction_amount em REAIS (valor/100)
 *  5. createMpCobranca envia transaction_amount em REAIS (valor/100) — correção do bug dos centavos
 *  6. pagamentos incluem X-Idempotency-Key
 *
 * IMPORTANTE (regra ts-no-dynamic-import): MercadoPagoBillingProvider lê
 * `process.env.MP_ACCESS_TOKEN` no module-load time (top-level const MP_TOKEN).
 * Static import congelaria MP_TOKEN='' antes de podermos stubar o env, fazendo
 * criarAssinatura lançar. Uso dynamic import como "module loading boundary" —
 * exceção explícita da regra — para garantir que o env é aplicado antes do load.
 *
 * Sem Zod no projeto: leituras pós-JSON.parse usam type guards com `in`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type FetchCall = { url: string; init: RequestInit };

const calls: FetchCall[] = [];
const queue: { status: number; body: unknown }[] = [];

function enqueue(status: number, body: unknown): void {
  queue.push({ status, body });
}

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : String(status),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

async function loadProvider(): Promise<
  typeof import('../src/lib/billing/mercadopago.ts')
> {
  vi.stubEnv('MP_ACCESS_TOKEN', 'TEST_TOKEN');
  vi.stubEnv('MP_WEBHOOK_SECRET', 'TEST_SECRET');
  vi.stubEnv('AVANCA_API_URL', 'https://avanca.test');
  return await import('../src/lib/billing/mercadopago.ts');
}

interface AssinaturaInputLike {
  tenant_id: string;
  pme_id: string;
  plano: string;
  payment_method: 'pix_auto' | 'credit_card' | 'boleto' | 'pix_qr';
}

function input(overrides: Partial<AssinaturaInputLike>): AssinaturaInputLike {
  return {
    tenant_id: 'vitrine-certa',
    pme_id: 'pme-test',
    plano: 'essencial',
    payment_method: 'pix_auto',
    ...overrides,
  };
}

function findCall(suffix: string): FetchCall | undefined {
  return calls.find((c) => c.url.endsWith(suffix));
}

function parseBody(call: FetchCall): Record<string, unknown> {
  return JSON.parse(call.init.body as string) as Record<string, unknown>;
}

function readStringField(
  obj: Record<string, unknown>,
  field: string
): string {
  const v = obj[field];
  return typeof v === 'string' ? v : '';
}

function readNumberField(
  obj: Record<string, unknown>,
  field: string
): number | undefined {
  const v = obj[field];
  return typeof v === 'number' ? v : undefined;
}

function readAutoRecurringAmount(
  obj: Record<string, unknown>
): number | undefined {
  if ('auto_recurring' in obj) {
    const ar = obj.auto_recurring;
    if (ar && typeof ar === 'object' && 'transaction_amount' in ar) {
      const ta = (ar as Record<string, unknown>).transaction_amount;
      return typeof ta === 'number' ? ta : undefined;
    }
  }
  return undefined;
}

function readPayerId(
  obj: Record<string, unknown>
): string {
  if ('payer' in obj) {
    const payer = obj.payer;
    if (payer && typeof payer === 'object' && 'id' in payer) {
      const id = (payer as Record<string, unknown>).id;
      return typeof id === 'string' ? id : '';
    }
  }
  return '';
}

beforeEach(() => {
  calls.length = 0;
  queue.length = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = vi.fn(
    async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      const next = queue.shift() ?? { status: 200, body: {} };
      return makeResponse(next.status, next.body);
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('MP customer_id fix', () => {
  it('1. search acha customer existente → devolve id real do MP (não pmeId)', async () => {
    const REAL_MP_ID = '9876543210';
    enqueue(200, {
      results: [{ id: REAL_MP_ID, email: 'pme-pme-123@avanca.com' }],
    });
    enqueue(200, {
      id: 'preapproval_1',
      status: 'authorized',
      init_point: 'https://mp.test/authorize',
    });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    const result = await provider.criarAssinatura(
      input({ pme_id: 'pme-123', payment_method: 'pix_auto' })
    );

    expect(calls[0].url).toContain(
      '/v1/customers/search?email=pme-pme-123%40avanca.com'
    );
    const pre = findCall('/preapproval');
    expect(pre).toBeDefined();
    const preBody = parseBody(pre!);
    const customerId = readStringField(preBody, 'customer_id');
    expect(customerId).toBe(REAL_MP_ID);
    expect(customerId).not.toBe('pme-123');
    expect(result.subscription.id).toBe('preapproval_1');
  });

  it('2. search vazio → cria customer → devolve id real', async () => {
    const NEW_MP_ID = '1111111111';
    enqueue(200, { results: [] });
    enqueue(200, { id: NEW_MP_ID, email: 'pme-new@avanca.com' });
    enqueue(200, { id: 'preapproval_2', status: 'authorized' });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    await provider.criarAssinatura(
      input({ pme_id: 'pme-new', payment_method: 'credit_card' })
    );

    const createCall = findCall('/v1/customers');
    expect(createCall?.init.method).toBe('POST');
    const pre = findCall('/preapproval');
    const preBody = parseBody(pre!);
    expect(readStringField(preBody, 'customer_id')).toBe(NEW_MP_ID);
  });

  it('3. race: search∅ → create 400 "already_exist" → re-search acha → id real', async () => {
    const REAL_MP_ID = '2222222222';
    enqueue(200, { results: [] });
    enqueue(400, { message: 'customer already exist' });
    enqueue(200, {
      results: [{ id: REAL_MP_ID, email: 'pme-race@avanca.com' }],
    });
    enqueue(200, { id: 'preapproval_3', status: 'authorized' });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    await provider.criarAssinatura(
      input({ pme_id: 'pme-race', payment_method: 'pix_auto' })
    );

    const pre = findCall('/preapproval');
    const preBody = parseBody(pre!);
    expect(readStringField(preBody, 'customer_id')).toBe(REAL_MP_ID);
    const searchCalls = calls.filter((c) =>
      c.url.includes('/v1/customers/search')
    );
    expect(searchCalls.length).toBe(2);
  });
});

describe('transaction_amount fix (centavos → reais)', () => {
  it('4. createMpSubscription (/preapproval) envia 49.00 para essencial', async () => {
    enqueue(200, { results: [{ id: 'c1', email: 'e' }] });
    enqueue(200, { id: 'p1', status: 'authorized' });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    await provider.criarAssinatura(
      input({ pme_id: 'p1', plano: 'essencial', payment_method: 'pix_auto' })
    );

    const preBody = parseBody(findCall('/preapproval')!);
    expect(readAutoRecurringAmount(preBody)).toBe(49);
  });

  it('5a. createMpCobranca (boleto) envia 99.00 para plus (não 9900)', async () => {
    enqueue(200, { results: [{ id: 'c2', email: 'e' }] });
    enqueue(200, { id: 'pay1', status: 'pending', transaction_amount: 99 });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    await provider.criarAssinatura(
      input({ pme_id: 'p2', plano: 'plus', payment_method: 'boleto' })
    );

    const payBody = parseBody(findCall('/v1/payments')!);
    expect(readNumberField(payBody, 'transaction_amount')).toBe(99);
    expect(readStringField(payBody, 'payment_method_id')).toBe('boleto');
    expect(readPayerId(payBody)).toBe('c2');
  });

  it('5b. createMpCobranca (pix_qr) envia 149.00 para premium', async () => {
    enqueue(200, { results: [{ id: 'c3', email: 'e' }] });
    enqueue(200, { id: 'pay2', status: 'pending' });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    await provider.criarAssinatura(
      input({ pme_id: 'p3', plano: 'premium', payment_method: 'pix_qr' })
    );

    const payBody = parseBody(findCall('/v1/payments')!);
    expect(readNumberField(payBody, 'transaction_amount')).toBe(149);
    expect(readStringField(payBody, 'payment_method_id')).toBe('pix');
  });
});

describe('X-Idempotency-Key on payments', () => {
  it('6. pagamentos incluem X-Idempotency-Key header', async () => {
    enqueue(200, { results: [{ id: 'c4', email: 'e' }] });
    enqueue(200, { id: 'pay3', status: 'pending' });

    const { MercadoPagoBillingProvider } = await loadProvider();
    const provider = new MercadoPagoBillingProvider('TEST_TOKEN');
    await provider.criarAssinatura(
      input({ pme_id: 'p4', payment_method: 'boleto' })
    );

    const payCall = findCall('/v1/payments');
    const headers = payCall!.init.headers as Record<string, string>;
    expect(headers['X-Idempotency-Key']).toMatch(/^p4-\d+$/);
  });
});
