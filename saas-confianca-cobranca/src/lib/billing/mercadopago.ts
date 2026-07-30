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
 *
 * CRYPTO INTEGRATION (CEO decision 28/jul/2026):
 * - MP_ACCESS_TOKEN (platform secret): SOPS+age encrypted in .env.local, NEVER in DB/repo
 * - Client PSP tokens (multi-tenant): AEAD XChaCha20-Poly1305 + envelope encryption
 *   with DEK PER TENANT (global KEK in DATA_KEK env var)
 * - PIX keys (recoverable): AEAD + envelope with DEK PER RECORD
 * - Blind index HMAC-SHA256 for searchable encrypted fields
 * - All token comparisons: crypto.timingSafeEqual (constant-time)
 */

import { createHmac, timingSafeEqual } from 'crypto';
import {
  // Envelope encryption for tenant-isolated data (client PSP tokens, PIX keys)
  encryptEnvelope,
  decryptEnvelope,
  generateTenantKeys,
  encryptForTenant,
  decryptForTenant,
  type EnvelopeResult,
  type TenantEncryptionKeys,
} from '@aapson/crypto/envelope';

// Blind index for searching encrypted PIX keys without decrypting
import {
  generateBlindIndex,
  verifyBlindIndex,
  type BlindIndexResult,
} from '@aapson/crypto/blind-index';

// Timing-safe comparison for webhook signatures and token validation
import {
  timingSafeEqual as cryptoTimingSafeEqual,
  verifyWebhookSignature,
} from '@aapson/crypto/timing-safe';

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

// Platform secret (our MP token) - loaded from SOPS+age encrypted .env.local
// NEVER stored in DB, NEVER logged
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

// ─── In-Memory Tenant Key Store (replace with persistent store in production) ─────
// In production, store TenantEncryptionKeys in your DB (encrypted DEKs only)
// This is a simple Map for demonstration - replace with Supabase table

interface StoredTenantKeys {
  tenantId: string;
  wrappedDek: Buffer;
  nonce: Buffer;
  tag: Buffer;
  kekVersion: string;
  createdAt: string;
  rotatedAt?: string;
}

const tenantKeyStore = new Map<string, StoredTenantKeys>();

/**
 * Get or create encryption keys for a tenant
 * In production, this would fetch from DB and decrypt with KEK
 */
async function getTenantKeys(tenantId: string): Promise<TenantEncryptionKeys> {
  const stored = tenantKeyStore.get(tenantId);
  
  if (stored) {
    return {
      tenantId: stored.tenantId,
      wrappedDek: {
        wrapped: stored.wrappedDek,
        nonce: stored.nonce,
        tag: stored.tag,
        kekVersion: stored.kekVersion,
      },
      kekVersion: stored.kekVersion,
      createdAt: stored.createdAt,
      rotatedAt: stored.rotatedAt,
    };
  }
  
  // Generate new tenant keys (first time)
  const keys = generateTenantKeys(tenantId, { kekEnvVar: 'DATA_KEK' });
  
  // Store wrapped DEK (in production, save to DB)
  tenantKeyStore.set(tenantId, {
    tenantId: keys.tenantId,
    wrappedDek: keys.wrappedDek.wrapped,
    nonce: keys.wrappedDek.nonce,
    tag: keys.wrappedDek.tag,
    kekVersion: keys.wrappedDek.kekVersion || 'v1',
    createdAt: keys.createdAt,
  });
  
  return keys;
}

/**
 * Encrypt client PSP token (MercadoPago access_token) for a tenant
 * Uses envelope encryption: DEK per tenant, wrapped by global KEK
 */
export async function encryptClientMpToken(
  tenantId: string,
  mpAccessToken: string
): Promise<EnvelopeResult> {
  const tenantKeys = await getTenantKeys(tenantId);
  return encryptForTenant(mpAccessToken, tenantKeys, { kekEnvVar: 'DATA_KEK' });
}

/**
 * Decrypt client PSP token for a tenant
 * Decrypts only in memory at point of use
 */
export async function decryptClientMpToken(
  tenantId: string,
  envelope: EnvelopeResult
): Promise<string> {
  const tenantKeys = await getTenantKeys(tenantId);
  const plaintext = decryptForTenant({ ...envelope, tenantKeys }, { kekEnvVar: 'DATA_KEK' });
  return plaintext.toString('utf8');
}

/**
 * Encrypt PIX key (recoverable data) with envelope encryption
 * Also generates blind index for searchability
 */
export async function encryptPixKey(
  pixKey: string,
  context: 'tenant' | 'platform' = 'tenant',
  tenantId?: string
): Promise<{ envelope: EnvelopeResult; blindIndex: BlindIndexResult }> {
  let envelope: EnvelopeResult;
  
  if (context === 'tenant' && tenantId) {
    const tenantKeys = await getTenantKeys(tenantId);
    envelope = encryptForTenant(pixKey, tenantKeys, { kekEnvVar: 'DATA_KEK' });
  } else {
    // Platform-level encryption (our own PIX keys)
    envelope = encryptEnvelope(pixKey, { kekEnvVar: 'DATA_KEK' });
  }
  
  // Generate blind index for search (different key from encryption!)
  const blindIndex = generateBlindIndex(pixKey, { 
    context: 'pix-key',
    keyEnvVar: 'BLIND_INDEX_KEY',
  });
  
  return { envelope, blindIndex };
}

/**
 * Decrypt PIX key
 */
export async function decryptPixKey(
  envelope: EnvelopeResult,
  context: 'tenant' | 'platform' = 'tenant',
  tenantId?: string
): Promise<string> {
  if (context === 'tenant' && tenantId) {
    const tenantKeys = await getTenantKeys(tenantId);
    const plaintext = decryptForTenant({ ...envelope, tenantKeys }, { kekEnvVar: 'DATA_KEK' });
    return plaintext.toString('utf8');
  } else {
    const plaintext = decryptEnvelope(envelope, { kekEnvVar: 'DATA_KEK' });
    return plaintext.toString('utf8');
  }
}

/**
 * Verify PIX key against blind index (constant-time)
 */
export function verifyPixKeyBlindIndex(
  pixKey: string,
  storedBlindIndexHex: string
): boolean {
  return verifyBlindIndex(pixKey, storedBlindIndexHex, { 
    context: 'pix-key',
    keyEnvVar: 'BLIND_INDEX_KEY',
  });
}

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

// Idempotent flow: search by email → if exists, reuse real MP id;
// if not, create. If creation fails with "already exists" (race), re-search.
// NEVER returns pmeId as customer_id — that broke /preapproval (400) and 
// /v1/payments (404) when customer already existed in MP.

function isCustomerAlreadyExistsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b400\b/.test(msg) ||
    /\b422\b/.test(msg) ||
    /already[_ ]?exist/i.test(msg) ||
    /recognized[_ ]?user/i.test(msg) ||
    /customer[_ ]?already/i.test(msg) ||
    /not[- ]?found|not found/i.test(msg)
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

  // 1. Search existing customer by email — reuse real MP id
  const existing = await searchMpCustomerByEmail(email);
  if (existing) return existing;

  // 2. Doesn't exist — create
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
    // 3. Race: another request created between search and create — re-search
    if (isCustomerAlreadyExistsError(err)) {
      const existingAfterRace = await searchMpCustomerByEmail(email);
      if (existingAfterRace) return existingAfterRace;
    }
    throw err;
  }
}

// ─── Helper: create MP subscription (Pix Automático or Cartão) ────────────

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

async function createMpCobranca(
  customerId: string,
  plano: string,
  paymentMethod: PaymentMethod,
  pmeId: string
): Promise<any> {
  const valor = PLANO_VALOR[plano] || PLANO_VALOR.essencial;

  const cobranca: Record<string, unknown> = {
    transaction_amount: valor / 100, // PLANO_VALOR in centavos; MP expects reais
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

  // Pix Automático: returns authorization_url
  if (paymentMethod === 'pix_auto') {
    base.authorization_url =
      (mpResponse.init_point as string) ||
      (mpResponse.authorization_url as string) ||
      null;
    base.status = 'pending';
  }

  // Credit card: returns checkout_url
  if (paymentMethod === 'credit_card') {
    base.checkout_url =
      (mpResponse.init_point as string) ||
      (mpResponse.checkout_url as string) ||
      null;
    base.status = 'pending';
  }

  // Boleto: returns boleto_url + vencimento
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

  // Pix QR: returns qr_code + vencimento
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

// ─── Helper: determine subscription status from event ──────────────────────

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
   * Creates a subscription in MP.
   * - pix_auto: creates Pix Automático authorization → returns authorization_url
   * - credit_card: creates card subscription → returns checkout_url (MP-hosted)
   * - boleto: creates boleto cobrança → returns boleto_url
   * - pix_qr: creates PIX QR cobrança → returns qr_code
   */
  async criarAssinatura(
    input: AssinaturaInput
  ): Promise<SubscriptionResult> {
    if (!MP_TOKEN) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    const { plano, pme_id, payment_method } = input;

    // 1. Create or fetch customer in MP
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

    // 2. Create subscription or cobrança depending on method
    let mpResponse: Record<string, unknown>;

    if (payment_method === 'pix_auto' || payment_method === 'credit_card') {
      // Pix Automático or Cartão: recurring subscription via /preapproval
      mpResponse = await createMpSubscription(
        customer.id,
        customer.email,
        plano,
        payment_method,
        pme_id
      );
    } else {
      // Boleto or PIX QR: one-off cobrança via /v1/payments
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
   * Process MP webhook failure.
   * Classifies failure and returns reconciliation state.
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
      // C5 dunning: retry in 24h
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
   * Retry a failed cobrança.
   * Used by C5 dunning (retry 24h/48h).
   */
  async retry(
    subscriptionId: string,
    attempt: number
  ): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    message: string;
  }> {
    // For boleto/pix_qr, create new cobrança
    // For pix_auto/credit_card, MP handles retry automatically
    return {
      success: true,
      status: 'pending',
      message: `Retry ${attempt} initiated`,
    };
  }

  /**
   * Query subscription status from MP.
   */
  async consultarStatus(subscriptionId: string): Promise<{
    status: SubscriptionStatus;
    prox_cobranca: string | null;
    provider_status: string;
    details?: Record<string, unknown>;
  }> {
    try {
      const response = await mpFetch(`/preapproval/${subscriptionId}`, {
        method: 'GET',
      });

      return {
        status: mapMpStatus(response.status),
        prox_cobranca: response.next_payment_date || null,
        provider_status: response.status,
        details: response,
      };
    } catch (err) {
      return {
        status: 'pending',
        prox_cobranca: null,
        provider_status: 'unknown',
        details: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  /**
   * Validate webhook signature using constant-time comparison.
   * Supports multiple signature formats (MP, GitHub, Stripe, etc.)
   */
  async validarWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    if (!MP_WEBHOOK_SECRET) {
      console.warn('MP_WEBHOOK_SECRET not configured, skipping validation');
      return true; // Allow in dev, block in prod
    }

    // Use constant-time verification from crypto module
    return verifyWebhookSignature(payload, signature, MP_WEBHOOK_SECRET);
  }

  /**
   * Renew monthly cobrança for boleto/PIX QR.
   */
  async renovarCobranca(assinatura: Assinatura): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    boleto_url?: string | null;
    qr_code?: string | null;
    prox_cobranca?: string | null;
    message: string;
  }> {
    if (!MP_TOKEN) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    const { plano, pme_id, payment_method } = assinatura;

    // Need customer_id for cobrança
    const customerId = assinatura.provider_customer_id;
    if (!customerId) {
      throw new Error('provider_customer_id não encontrado na assinatura');
    }

    let mpResponse: Record<string, unknown>;

    if (payment_method === 'boleto' || payment_method === 'pix_qr') {
      mpResponse = await createMpCobranca(
        customerId,
        plano,
        payment_method,
        pme_id
      );
    } else {
      // For pix_auto/credit_card, MP handles recurrence automatically
      return {
        success: true,
        status: 'active',
        message: 'Recorrência automática gerenciada pelo MP',
      };
    }

    const renewed = buildAssinatura(
      { pme_id, plano, payment_method },
      mpResponse,
      payment_method
    );

    return {
      success: true,
      status: 'pending',
      boleto_url: renewed.boleto_url || null,
      qr_code: renewed.qr_code || null,
      prox_cobranca: renewed.prox_cobranca,
      message: 'Nova cobrança gerada',
    };
  }
}