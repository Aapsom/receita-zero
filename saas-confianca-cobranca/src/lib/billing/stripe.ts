/**
 * StripeBillingProvider — LEGACY provider.
 *
 * Stripe NÃO suporta Pix Automático (apenas QR Code).
 * Mantido para compatibilidade com assinaturas existentes pré-MP.
 * MP é o provider DEFAULT para novas assinaturas (ver router.ts).
 *
 * Ref: PLANO CONJUNTO §7.1.2c (Stripe não suporta Pix Automático)
 */

import {
  BillingProvider,
  ProviderName,
  SubscriptionResult,
  SubscriptionStatus,
  AssinaturaInput,
  WebhookEvent,
} from './types';

export class StripeBillingProvider implements BillingProvider {
  readonly name: ProviderName = 'mercadopago'; // compat: router resolves by payment_method

  async criarAssinatura(
    _input: AssinaturaInput
  ): Promise<SubscriptionResult> {
    throw new Error(
      'Stripe não suporta Pix Automático. Use MercadoPagoBillingProvider.'
    );
  }

  async webhookFalha(_event: WebhookEvent): Promise<{
    subscription_id: string;
    status: SubscriptionStatus;
    motivo: string;
    retry_em?: string | null;
  }> {
    throw new Error('Stripe provider desativado. Use MercadoPagoBillingProvider.');
  }

  async retry(
    _subscriptionId: string,
    _attempt: number
  ): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    message: string;
  }> {
    throw new Error('Stripe provider desativado. Use MercadoPagoBillingProvider.');
  }

  async consultarStatus(_subscriptionId: string): Promise<{
    status: SubscriptionStatus;
    prox_cobranca: string | null;
    provider_status: string;
    details?: Record<string, unknown>;
  }> {
    throw new Error('Stripe provider desativado. Use MercadoPagoBillingProvider.');
  }

  async validarWebhookSignature(
    _payload: string,
    _signature: string
  ): Promise<boolean> {
    throw new Error('Stripe provider desativado. Use MercadoPagoBillingProvider.');
  }

  async renovarCobranca(_assinatura: import('./types').Assinatura): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    boleto_url?: string | null;
    qr_code?: string | null;
    prox_cobranca?: string | null;
    message: string;
  }> {
    throw new Error('Stripe provider desativado. Use MercadoPagoBillingProvider.');
  }
}
