/**
 * BillingProviderRouter — routes billing operations to the correct provider.
 *
 * MP is the SOLE provider for all 4 payment methods:
 * - pix_auto → MP (Pix Automático)
 * - credit_card → MP (Cartão de Crédito)
 * - boleto → MP (Boleto Bancário)
 * - pix_qr → MP (PIX QR Code)
 *
 * Design: router is extensible — if a second provider is added in the future,
 * simply register it here. The BillingProvider interface ensures compatibility.
 */

import { MercadoPagoBillingProvider } from './mercadopago';
import { StripeBillingProvider } from './stripe';
import { StubBillingProvider } from './stub';
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

// ─── Provider Registry ───────────────────────────────────────────────────

const providers: Record<ProviderName, BillingProvider> = {
  mercadopago: new MercadoPagoBillingProvider(),
};

// ─── Payment Method → Provider Mapping ───────────────────────────────────

const PAYMENT_METHOD_PROVIDER: Record<PaymentMethod, ProviderName> = {
  pix_auto: 'mercadopago',
  credit_card: 'mercadopago',
  boleto: 'mercadopago',
  pix_qr: 'mercadopago',
};

// ─── Router ──────────────────────────────────────────────────────────────

export class BillingProviderRouter {
  private providers: Record<ProviderName, BillingProvider>;

  constructor() {
    this.providers = providers;
  }

  /**
   * Resolve o provider para um método de pagamento.
   */
  getProvider(paymentMethod: PaymentMethod): BillingProvider {
    const providerName = PAYMENT_METHOD_PROVIDER[paymentMethod];
    const provider = this.providers[providerName];

    if (!provider) {
      throw new Error(
        `Nenhum provider configurado para payment_method: ${paymentMethod}`
      );
    }

    return provider;
  }

  /**
   * Resolve o provider por nome.
   */
  getProviderByName(name: ProviderName): BillingProvider {
    const provider = this.providers[name];

    if (!provider) {
      throw new Error(`Provider não encontrado: ${name}`);
    }

    return provider;
  }

  /**
   * Cria uma assinatura via router.
   * O provider é resolvido automaticamente pelo payment_method.
   */
  async criarAssinatura(
    input: AssinaturaInput
  ): Promise<SubscriptionResult> {
    const provider = this.getProvider(input.payment_method);
    return provider.criarAssinatura(input);
  }

  /**
   * Processa falha de webhook.
   * O provider é resolvido pelo nome no evento.
   */
  async webhookFalha(event: WebhookEvent): Promise<{
    subscription_id: string;
    status: SubscriptionStatus;
    motivo: string;
    retry_em?: string | null;
  }> {
    const provider = this.getProviderByName(event.provider);
    return provider.webhookFalha(event);
  }

  /**
   * Retry de cobrança falha.
   * O provider é resolvido pelo payment_method da assinatura.
   */
  async retry(
    subscriptionId: string,
    paymentMethod: PaymentMethod,
    attempt: number
  ): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    message: string;
  }> {
    const provider = this.getProvider(paymentMethod);
    return provider.retry(subscriptionId, attempt);
  }

  /**
   * Consulta status de assinatura.
   */
  async consultarStatus(
    subscriptionId: string,
    providerName: ProviderName
  ): Promise<{
    status: SubscriptionStatus;
    prox_cobranca: string | null;
    provider_status: string;
    details?: Record<string, unknown>;
  }> {
    const provider = this.getProviderByName(providerName);
    return provider.consultarStatus(subscriptionId);
  }
  /**
   * Renova cobrança mensal para boleto/PIX QR Code.
   * O provider é resolvido pelo payment_method da assinatura.
   */
  async renovarCobranca(assinatura: Assinatura): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    boleto_url?: string | null;
    qr_code?: string | null;
    prox_cobranca?: string | null;
    message: string;
  }> {
    const provider = this.getProvider(assinatura.payment_method);
    return provider.renovarCobranca(assinatura);
  }

  /**
   * Valida assinatura de webhook.
   */
  async validarWebhookSignature(
    providerName: ProviderName,
    payload: string,
    signature: string
  ): Promise<boolean> {
    const provider = this.getProviderByName(providerName);
    return provider.validarWebhookSignature(payload, signature);
  }

  /**
   * Lista todos os providers registrados.
   */
  listProviders(): ProviderName[] {
    return Object.keys(this.providers) as ProviderName[];
  }

  /**
   * Lista todos os payment methods suportados.
   */
  listPaymentMethods(): PaymentMethod[] {
    return Object.keys(PAYMENT_METHOD_PROVIDER) as PaymentMethod[];
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────

export const billingRouter = new BillingProviderRouter();
