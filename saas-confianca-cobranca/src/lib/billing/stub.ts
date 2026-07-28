/**
 * StubBillingProvider — for testing and development.
 *
 * Returns mock data without calling any external API.
 * Used in tests and when MP_ACCESS_TOKEN is not configured.
 */

import {
  BillingProvider,
  ProviderName,
  SubscriptionResult,
  SubscriptionStatus,
  AssinaturaInput,
  WebhookEvent,
  Assinatura,
} from './types';

export class StubBillingProvider implements BillingProvider {
  readonly name: ProviderName = 'mercadopago';

  async criarAssinatura(
    input: AssinaturaInput
  ): Promise<SubscriptionResult> {
    const now = new Date().toISOString();

    const assinatura: Assinatura = {
      id: `stub_${Date.now()}`,
      pme_id: input.pme_id,
      plano: input.plano,
      provider: 'mercadopago',
      payment_method: input.payment_method,
      status: 'pending',
      provider_subscription_id: `mp_stub_${Date.now()}`,
      provider_customer_id: `cust_stub_${input.pme_id}`,
      prox_cobranca: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      created_at: now,
      updated_at: now,
    };

    if (input.payment_method === 'pix_auto') {
      assinatura.authorization_url = 'https://mock.mercadopago.com/pix/auth';
    }
    if (input.payment_method === 'credit_card') {
      assinatura.checkout_url = 'https://mock.mercadopago.com/checkout';
    }
    if (input.payment_method === 'boleto') {
      assinatura.boleto_url = 'https://mock.mercadopago.com/boleto';
      assinatura.vencimento = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
    }
    if (input.payment_method === 'pix_qr') {
      assinatura.qr_code = 'mock_qr_code_payload';
      assinatura.qr_code_base64 = 'data:image/png;base64,mock';
      assinatura.vencimento = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const requiresRedirect =
      input.payment_method === 'pix_auto' ||
      input.payment_method === 'credit_card';

    return {
      subscription: assinatura,
      requires_redirect: requiresRedirect,
      redirect_url: requiresRedirect
        ? input.payment_method === 'pix_auto'
          ? assinatura.authorization_url
          : assinatura.checkout_url
        : null,
      message: 'Stub subscription created',
    };
  }

  async webhookFalha(_event: WebhookEvent): Promise<{
    subscription_id: string;
    status: SubscriptionStatus;
    motivo: string;
    retry_em?: string | null;
  }> {
    return {
      subscription_id: 'stub_sub',
      status: 'failed',
      motivo: 'Stub failure',
      retry_em: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  async retry(_subscriptionId: string, _attempt: number): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    message: string;
  }> {
    return {
      success: true,
      status: 'active',
      message: 'Stub retry success',
    };
  }

  async consultarStatus(_subscriptionId: string): Promise<{
    status: SubscriptionStatus;
    prox_cobranca: string | null;
    provider_status: string;
    details?: Record<string, unknown>;
  }> {
    return {
      status: 'active',
      prox_cobranca: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      provider_status: 'active',
    };
  }

  async validarWebhookSignature(
    _payload: string,
    _signature: string
  ): Promise<boolean> {
    return true;
  }

  async renovarCobranca(assinatura: Assinatura): Promise<{
    success: boolean;
    status: SubscriptionStatus;
    boleto_url?: string | null;
    qr_code?: string | null;
    prox_cobranca?: string | null;
    message: string;
  }> {
    return {
      success: true,
      status: 'active',
      boleto_url: 'https://mock.mercadopago.com/boleto/renewed',
      qr_code: 'mock-qr-code-renewed',
      prox_cobranca: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      message: `Mock renewal for ${assinatura.payment_method}`,
    };
  }
}
