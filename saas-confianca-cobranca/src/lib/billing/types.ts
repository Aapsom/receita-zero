/**
 * BillingProvider interface and types for the SaaS Confiabilidade Cobrança.
 *
 * Ports & Adapters pattern: BillingProvider is the port (interface),
 * MercadoPagoBillingProvider is the adapter (implementation).
 *
 * MP is the SOLE provider for all 4 payment methods:
 * - pix_auto: Pix Automático (débito automático, uma autorização)
 * - credit_card: Cartão de Crédito (MP-hosted checkout, PCI-safe)
 * - boleto: Boleto Bancário (pagamento mensal)
 * - pix_qr: PIX QR Code (pagamento mensal)
 */

// ─── Enums ───────────────────────────────────────────────────────────────

export type PaymentMethod = 'pix_auto' | 'credit_card' | 'boleto' | 'pix_qr';

export type SubscriptionStatus =
  | 'active'
  | 'failed'
  | 'grace'
  | 'canceled'
  | 'suspended'
  | 'pending';

export type ProviderName = 'mercadopago';

// ─── Domain Models ────────────────────────────────────────────────────────

export interface Plano {
  id: string;
  nome: string;
  valor: number; // em centavos
  ciclo: 'mensal' | 'anual';
  payment_methods: PaymentMethod[];
}

export interface AssinaturaInput {
  plano: string; // plano id or slug
  pme_id: string;
  payment_method: PaymentMethod;
  tenant_id?: string;
}

export interface Assinatura {
  id: string;
  pme_id: string;
  plano: string;
  provider: ProviderName;
  payment_method: PaymentMethod;
  status: SubscriptionStatus;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  prox_cobranca: string | null; // ISO date
  created_at: string;
  updated_at: string;
  // MP-specific fields
  checkout_url?: string | null; // for credit_card redirect
  authorization_url?: string | null; // for pix_auto
  boleto_url?: string | null; // for boleto
  qr_code?: string | null; // for pix_qr
  qr_code_base64?: string | null; // for pix_qr
  vencimento?: string | null; // for boleto/pix_qr
}

export interface SubscriptionResult {
  subscription: Assinatura;
  requires_redirect: boolean;
  redirect_url?: string | null;
  message?: string;
}

// ─── Webhook Event (normalized) ──────────────────────────────────────────

export interface WebhookEvent {
  evento_id: string; // unique event id from provider
  provider: ProviderName;
  tipo: string; // normalized event type
  subscription_id: string;
  pme_id?: string;
  status: SubscriptionStatus;
  payload: Record<string, unknown>;
  timestamp: string;
  raw_signature?: string;
}

// ─── BillingProvider Port (interface) ────────────────────────────────────

export interface BillingProvider {
  readonly name: ProviderName;

  /**
   * Cria uma assinatura no provider.
   * - pix_auto: cria autorização Pix Automático → retorna authorization_url
   * - credit_card: cria subscription cartão → retorna checkout_url (MP-hosted)
   * - boleto: cria cobrança boleto → retorna boleto_url
   * - pix_qr: cria cobrança PIX QR → retorna qr_code
   */
  criarAssinatura(input: AssinaturaInput): Promise<SubscriptionResult>;

  /**
   * Processa falha de webhook do provider.
   * Classifica a falha e retorna o estado de conciliação.
   */
  webhookFalha(event: WebhookEvent): Promise<{
    subscription_id: string;
    status: SubscriptionStatus;
    motivo: string;
    retry_em?: string | null;
  }>;

  /**
   * Tenta novamente uma cobrança que falhou.
   * Usado pelo C5 dunning (retry 24h/48h).
   */
  retry(subscriptionId: string, attempt: number): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    message: string;
  }>;
  /**
   * Renova uma cobrança mensal para boleto/PIX QR Code.
   * Chama createMpCobranca() para gerar nova cobrança no MP.
   * Usado pelo cron de renovação (10 dias antes do vencimento).
   */
  renovarCobranca(assinatura: Assinatura): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    boleto_url?: string | null;
    qr_code?: string | null;
    prox_cobranca?: string | null;
    message: string;
  }>;

  /**
   * Consulta o status atual de uma assinatura no provider.
   */
  consultarStatus(subscriptionId: string): Promise<{
    status: SubscriptionStatus;
    prox_cobranca: string | null;
    provider_status: string;
    details?: Record<string, unknown>;
  }>;

  /**
   * Valida a assinatura do webhook (HMAC).
   */
  validarWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean>;
}
