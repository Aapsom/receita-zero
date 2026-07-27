/**
 * MercadoPagoBillingProvider — the SOLE BillingProvider for Avança.
 *
 * Supports 4 payment methods via Mercado Pago:
 * - pix_auto: Pix Automático (débito automático, uma autorização)
 * - credit_card: Cartão de Crédito (MP-hosted checkout, PCI-safe)
 * - boleto: Boleto Bancário (pagamento mensal)
 * - pix_qr: PIX QR Code (pagamento mensal)
 *
 * Security: Nenhum dado de cartão toca este sistema.
 * - credit_card: MP retorna checkout_url → Vitrine Certa redireciona PME para MP
 * - pix_auto: MP retorna authorization_url → Vitrine Certa redireciona PME para MP
 * - boleto/pix_qr: MP gera boleto/QR → Avança retorna dados via webhook
 *
 * Ref: PLANO CONJUNTO §7.1 (PCI DSS + LGPD)
 */


import { createHmac, timingSafeEqual } from 'crypto';
import {
  BillingProvider,
  PaymentMethod,
  ProviderName,
  SubscriptionResult,
  SubscriptionStatus,
  Assinatura,
  AssinaturaInput,
  WebhookEvent,
} from './types';

// ─── MP API Constants ───────────────────────────────────────────────────

const MP_API_BASE = 'https://api.mercadopago.com';
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';

// MP plan/product mapping (configured per tenant)
const PLANO_VALOR: Record<string, number> = {
  essencial: 4900, // R$49.00
  plus: 9900, // R$99.00
  premium: 14900, // R$149.00
};

// ─── MP Status Mapping ───────────────────────────────────────────────────

const MP_STATUS_FALHA: Record<string, true> = {
  '400': true,
  '401': true,
  '403': true,
  '404': true,
  '429': true,
  '500': true,
  '502': true,
  '503': true,
  '504': true,
};

const MP_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  canceled: 'canceled',
  completed: 'active',
  failed: 'failed',
  pending: 'pending',
  authorized: 'active',
  in_grace: 'grace',
  suspended: 'suspended',
};

// ─── Helper: MP API call ─────────────────────────────────────────────────

async function mpFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${MP_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `MP API error ${response.status}: ${response.statusText} ${errorBody}`
    );
  }

  return response.json();
}

// ─── Helper: map MP status to C5 status ──────────────────────────────────

function mapMpStatus(mpStatus: string): SubscriptionStatus {
  return MP_STATUS_MAP[mpStatus] || 'pending';
}

// ─── Helper: create MP customer ──────────────────────────────────────────
//
// Fluxo (idempotente): search por email → se acha, reusa o id real do MP;
// se não acha, cria. Se a criação falhar por "já existe" (race / reuse),
// refaz a search. Nunca devolve `pmeId` como customer_id — isso quebrava
// /preapproval (400 "Invalid request data") e /v1/payments (404 "Customer
// not found") quando o customer já existia no MP.

function isCustomerAlreadyExistsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // MP API error surface via mpFetch: "MP API error 4xx: ... <body>"
  // Body real: { cause: [{ code: 'already_exist' }] } ou similar.
  return (
    /\b400\b/.test(msg) ||
    /\b422\b/.test(msg) ||
    /already[_ ]?exist/i.test(msg) ||
    /recognized[_ ]?user/i.test(msg) ||
    /customer[_ ]?already/i.test(msg) ||
    /nota-found|not found/i.test(msg)
  );
}

async function searchMpCustomerByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const result = await mpFetch(
    `/v1/customers/search?email=${encodeURIComponent(email)}`,
    { method: 'GET' }
  );
  const results = Array.isArray(result?.results) ? result.results : [];
  const found = results[0];
  if (!found || !found.id) return null;
  return { id: String(found.id), email: String(found.email || email) };
}

async function createMpCustomer(
  pmeId: string
): Promise<{ id: string; email: string }> {
  const email = `pme-${pmeId}@avanca.com`;

  // 1. Busca customer existente por email — reusa o id real do MP.
  const existing = await searchMpCustomerByEmail(email);
  if (existing) return existing;

  // 2. Não existe — cria.
  try {
    const customer = await mpFetch('/v1/customers', {
      method: 'POST',
      body: JSON.stringify({
        email,
        external_account_holder: {
          customer_id: pmeId,
        },
        metadata: {
          pme_id: pmeId,
          source: 'avanca',
        },
      }),
    });

    return {
      id: String(customer.id || ''),
      email: String(customer.email || email),
    };
  } catch (err) {
    // 3. Race: outro request criou entre search e create — refaz a search.
    if (isCustomerAlreadyExistsError(err)) {
      const existingAfterRace = await searchMpCustomerByEmail(email);
      if (existingAfterRace) return existingAfterRace;
    }
    throw err;
  }
}

// ─── Helper: create MP subscription (Pix Automático or Cartão) ────────────
// Uses /preapproval endpoint per MP API docs

async function createMpSubscription(
  customerId: string,
  customerEmail: string,
  plano: string,
  paymentMethod: PaymentMethod,
  pmeId: string
): Promise<any> {
  const valor = PLANO_VALOR[plano] || PLANO_VALOR.essencial;

  const subscription: Record<string, unknown> = {
    customer_id: customerId,
    payer_email: customerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: valor / 100,
      currency_id: 'BRL',
    },
    status: 'authorized',
    reason: `Assinatura Avança ${plano}`,
    back_url: `${process.env.AVANCA_API_URL || 'https://avanca.com.br'}`,
    metadata: {
      pme_id: pmeId,
      plano,
      payment_method: paymentMethod,
      source: 'avanca',
    },
    notification_url: `${process.env.AVANCA_API_URL || 'https://avanca.com.br'}/api/webhooks/mercadopago`,
  };

  return mpFetch('/preapproval', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

// ─── Helper: create MP cobrança (boleto ou pix_qr) ────────────────────────
// Uses /v1/payments with transaction_amount + payer per MP API docs

async function createMpCobranca(
  customerId: string,
  plano: string,
  paymentMethod: PaymentMethod,
  pmeId: string
): Promise<any> {
  const valor = PLANO_VALOR[plano] || PLANO_VALOR.essencial;

  const cobranca: Record<string, unknown> = {
    transaction_amount: valor / 100, // PLANO_VALOR está em centavos; MP espera reais
    description: `Assinatura Avança ${plano}`,
    payer: {
      id: customerId,
    },
    metadata: {
      pme_id: pmeId,
      plano,
      payment_method: paymentMethod,
      source: 'avanca',
    },
    notification_url: `${process.env.AVANCA_API_URL || 'https://avanca.com.br'}/api/webhooks/mercadopago`,
  };

  if (paymentMethod === 'boleto') {
    cobranca.payment_method_id = 'boleto';
  }

  if (paymentMethod === 'pix_qr') {
    cobranca.payment_method_id = 'pix';
  }

  return mpFetch('/v1/payments', {
    method: 'POST',
    body: JSON.stringify(cobranca),
    headers: {
      'X-Idempotency-Key': `${pmeId}-${Date.now()}`,
    },
  });
}

// ─── Helper: build Assinatura from MP response ───────────────────────────

function buildAssinatura(
  input: AssinaturaInput,
  mpResponse: any,
  paymentMethod: PaymentMethod
): Assinatura {
  const now = new Date().toISOString();

  const base: Assinatura = {
    id: (mpResponse.id as string) || '',
    pme_id: input.pme_id,
    plano: input.plano,
    provider: 'mercadopago',
    payment_method: paymentMethod,
    status: 'pending',
    provider_subscription_id:
      (mpResponse.id as string) || (mpResponse.subscription_id as string) || null,
    provider_customer_id:
      (mpResponse.customer_id as string) || (mpResponse.customer?.id as string) || null,
    prox_cobranca: (mpResponse.next_payment_date as string) || null,
    created_at: now,
    updated_at: now,
  };

  // Pix Automático: retorna authorization_url
  if (paymentMethod === 'pix_auto') {
    base.authorization_url =
      (mpResponse.init_point as string) ||
      (mpResponse.authorization_url as string) ||
      null;
    base.status = 'pending';
  }

  // Credit card: retorna checkout_url
  if (paymentMethod === 'credit_card') {
    base.checkout_url =
      (mpResponse.init_point as string) ||
      (mpResponse.checkout_url as string) ||
      null;
    base.status = 'pending';
  }

  // Boleto: retorna boleto_url + vencimento
  if (paymentMethod === 'boleto') {
    base.boleto_url =
      (mpResponse.boleto_url as string) ||
      (mpResponse.point_of_interaction?.transaction_data?.url as string) ||
      null;
    base.vencimento =
      (mpResponse.date_of_expiration as string) ||
      (mpResponse.vencimento as string) ||
      null;
    base.status = 'pending';
  }

  // Pix QR: retorna qr_code + vencimento
  if (paymentMethod === 'pix_qr') {
    base.qr_code =
      (mpResponse.point_of_interaction?.transaction_data?.qr_code as string) ||
      (mpResponse.qr_code as string) ||
      null;
    base.qr_code_base64 =
      (mpResponse.point_of_interaction?.transaction_data?.qr_code_base64 as string) ||
      (mpResponse.qr_code_base64 as string) ||
      null;
    base.vencimento =
      (mpResponse.date_of_expiration as string) ||
      (mpResponse.vencimento as string) ||
      null;
    base.status = 'pending';
  }

  return base;
}

// ─── Helper: build SubscriptionResult ──────────────────────────────────────

function buildSubscriptionResult(
  assinatura: Assinatura,
  paymentMethod: PaymentMethod
): SubscriptionResult {
  const requiresRedirect =
    paymentMethod === 'pix_auto' || paymentMethod === 'credit_card';

  const redirectUrl =
    paymentMethod === 'pix_auto'
      ? assinatura.authorization_url
      : paymentMethod === 'credit_card'
      ? assinatura.checkout_url
      : null;

  return {
    subscription: assinatura,
    requires_redirect: requiresRedirect,
    redirect_url: redirectUrl,
    message: requiresRedirect
      ? `Redirecione o PME para autorização no MP`
      : `Cobrança criada. PME paga no vencimento.`,
  };
}

// ─── Helper: extract evento_id from MP webhook ────────────────────────────

function extractEventoId(payload: Record<string, unknown>): string {
  const action = (payload.action as string) || '';
  const data = payload.data as Record<string, unknown> | undefined;
  const dataId = (data?.id as string) || '';

  return `${action}_${dataId}`;
}

// ─── Helper: normalize MP event type ───────────────────────────────────────

function normalizeEventType(payload: Record<string, unknown>): string {
  const action = (payload.action as string) || '';
  const type = (payload.type as string) || '';

  // Subscription events
  if (type === 'subscription' || action.includes('subscription')) {
    if (action.includes('activated')) return 'subscription.activated';
    if (action.includes('failed')) return 'subscription.failed';
    if (action.includes('suspended')) return 'subscription.suspended';
    if (action.includes('canceled')) return 'subscription.canceled';
    if (action.includes('updated')) return 'subscription.updated';
  }

  // Payment events
  if (type === 'payment' || action.includes('payment')) {
    if (action.includes('confirmed')) return 'payment.confirmed';
    if (action.includes('failed')) return 'payment.failed';
    if (action.includes('pending')) return 'payment.pending';
    if (action.includes('refunded')) return 'payment.refunded';
  }

  return `unknown.${action || type}`;
}

// ─── Helper: determine subscription status from event ───────────────────────

function statusFromEvent(
  eventType: string,
  payload: Record<string, unknown>
): SubscriptionStatus {
  switch (eventType) {
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

// ─── MercadoPagoBillingProvider ────────────────────────────────────────────

export class MercadoPagoBillingProvider implements BillingProvider {
  readonly name: ProviderName = 'mercadopago';

  /**
   * Cria uma assinatura no MP.
   * - pix_auto: cria autorização Pix Automático → retorna authorization_url
   * - credit_card: cria subscription cartão → retorna checkout_url (MP-hosted)
   * - boleto: cria cobrança boleto → retorna boleto_url
   * - pix_qr: cria cobrança PIX QR → retorna qr_code
   */
  async criarAssinatura(
    input: AssinaturaInput
  ): Promise<SubscriptionResult> {
    if (!MP_TOKEN) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    const { plano, pme_id, payment_method } = input;

    // 1. Cria ou busca customer no MP
    let customer: { id: string; email: string };
    try {
      customer = await createMpCustomer(pme_id);
    } catch (err) {
      throw new Error(
        `Falha ao criar customer no MP: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // 2. Cria subscription ou cobrança dependendo do método
    let mpResponse: Record<string, unknown>;

    if (payment_method === 'pix_auto' || payment_method === 'credit_card') {
      // Pix Automático ou Cartão: subscription recorrente via /preapproval
      mpResponse = await createMpSubscription(
        customer.id,
        customer.email,
        plano,
        payment_method,
        pme_id
      );
    } else {
      // Boleto ou PIX QR: cobrança pontual via /v1/payments
      mpResponse = await createMpCobranca(
        customer.id,
        plano,
        payment_method,
        pme_id
      );
    }

    // 3. Build Assinatura
    const assinatura = buildAssinatura(input, mpResponse, payment_method);

    // 4. Build result
    return buildSubscriptionResult(assinatura, payment_method);
  }

  /**
   * Processa falha de webhook do MP.
   * Classifica a falha e retorna o estado de conciliação.
   */
  async webhookFalha(event: WebhookEvent): Promise<{
    subscription_id: string;
    status: SubscriptionStatus;
    motivo: string;
    retry_em?: string | null;
  }> {
    const { tipo, subscription_id, payload } = event;
    const status = statusFromEvent(tipo, payload);

    let motivo = '';
    let retryEm: string | null = null;

    if (tipo === 'payment.failed' || tipo === 'subscription.failed') {
      const cause = payload.cause as Record<string, unknown> | undefined;
      motivo =
        (cause?.description as string) ||
        (payload.failure_detail as string) ||
        'Pagamento falhou';
      // C5 dunning: retry em 24h
      retryEm = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (tipo === 'subscription.suspended') {
      motivo = 'Assinatura suspensa';
    } else if (tipo === 'subscription.canceled') {
      motivo = 'Assinatura cancelada';
    } else {
      motivo = `Evento: ${tipo}`;
    }

    return {
      subscription_id,
      status,
      motivo,
      retry_em: retryEm,
    };
  }

  /**
   * Tenta novamente uma cobrança que falhou.
   * Usado pelo C5 dunning (retry 24h/48h).
   */
  async retry(
    subscriptionId: string,
    attempt: number
  ): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    message: string;
  }> {
    if (!MP_TOKEN) {
      return {
        success: false,
        status: 'failed',
        message: 'MP_ACCESS_TOKEN não configurado',
      };
    }

    try {
      // MP subscription retry: reprocessa a cobrança
      const response = await mpFetch(
        `/v1/subscriptions/${subscriptionId}/retry`,
        {
          method: 'POST',
          body: JSON.stringify({ attempt }),
        }
      );

      const mpStatus = (response.status as string) || 'pending';
      const status = mapMpStatus(mpStatus);

      return {
        success: status === 'active',
        status,
        message: `Retry attempt ${attempt}: ${mpStatus}`,
      };
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        message: `Retry falhou: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Consulta o status atual de uma assinatura no MP.
   */
  async consultarStatus(subscriptionId: string): Promise<{
    status: SubscriptionStatus;
    prox_cobranca: string | null;
    provider_status: string;
    details?: Record<string, unknown>;
  }> {
    if (!MP_TOKEN) {
      return {
        status: 'pending',
        prox_cobranca: null,
        provider_status: 'not_configured',
      };
    }

    try {
      const response = await mpFetch(
        `/v1/subscriptions/${subscriptionId}`,
        {
          method: 'GET',
        }
      );

      const mpStatus = (response.status as string) || 'unknown';
      const status = mapMpStatus(mpStatus);
      const proxCobranca =
        (response.next_payment_date as string) ||
        (response.prorated_next_payment_date as string) ||
        null;

      return {
        status,
        prox_cobranca: proxCobranca,
        provider_status: mpStatus,
        details: {
          id: response.id,
          status: response.status,
          next_payment_date: response.next_payment_date,
          payment_method: response.payment_method,
        },
      };
    } catch (err) {
      return {
        status: 'failed',
        prox_cobranca: null,
        provider_status: 'error',
        details: {
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  /**
   * Valida a assinatura do webhook do MP (HMAC).
   * MP envia X-Signature header com HMAC-SHA256 do payload.
   */
  async validarWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    if (!MP_WEBHOOK_SECRET) {
      // Em desenvolvimento, pular validação
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    }

    try {
      const expected = createHmac('sha256', MP_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      return timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch {
      return false;
    }
  }
}
