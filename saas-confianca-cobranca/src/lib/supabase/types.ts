/**
 * Supabase type definitions for Avança.
 *
 * Extends the MVP schema (0001-0012) with MP integration tables:
 * - subscriptions: MP subscription tracking
 * - partidas_abertas: contas a receber em aberto
 * - livro_razao: contabilidade por trás (partidas a receber)
 * - webhook_event: idempotência de webhook
 * - tentativa: tentativas de dunning
 * - conciliacao: estado de conciliação
 */

// ─── Enums ───────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'active'
  | 'failed'
  | 'grace'
  | 'canceled'
  | 'suspended'
  | 'pending';

export type PaymentMethod =
  | 'pix_auto'
  | 'credit_card'
  | 'boleto'
  | 'pix_qr';

export type ProviderName = 'mercadopago';

export type TentativaStatus = 'pending' | 'done' | 'respondido';
export type TentativaTipo = 'ligacao' | 'whatsapp' | 'email';
export type ConciliacaoStatus = 'ok' | 'falhou' | 'em_grace' | 'cancelada';

// ─── Database Tables ───────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      // ─── MVP Tables (existing) ──────────────────────────────────────────
      tenants: {
        Row: {
          id: string;
          nome: string;
          cnpj_hash: string;
          plano: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cnpj_hash: string;
          plano: string;
          criado_em?: string;
        };
        Update: Partial<{
          id: string;
          nome: string;
          cnpj_hash: string;
          plano: string;
          criado_em: string;
        }>;
      };

      clientes: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          cpf_cnpj_hash: string;
          email: string | null;
          whatsapp: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          cpf_cnpj_hash: string;
          email?: string | null;
          whatsapp?: string | null;
          criado_em?: string;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          nome: string;
          cpf_cnpj_hash: string;
          email: string | null;
          whatsapp: string | null;
          criado_em: string;
        }>;
      };

      recorrencias: {
        Row: {
          id: string;
          tenant_id: string;
          cliente_id: string;
          valor: number;
          ciclo: string;
          prox_cobranca: string | null;
          status: string;
          ativo: boolean;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          cliente_id: string;
          valor: number;
          ciclo: string;
          prox_cobranca?: string | null;
          status: string;
          ativo?: boolean;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          cliente_id: string;
          valor: number;
          ciclo: string;
          prox_cobranca: string | null;
          status: string;
          ativo: boolean;
        }>;
      };

      tentativas: {
        Row: {
          id: string;
          tenant_id: string;
          recorrencia_id: string;
          tipo: TentativaTipo;
          status: TentativaStatus;
          motivo: string | null;
          criado_em: string;
          retry_em: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          recorrencia_id: string;
          tipo: TentativaTipo;
          status: TentativaStatus;
          motivo?: string | null;
          criado_em?: string;
          retry_em?: string | null;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          recorrencia_id: string;
          tipo: TentativaTipo;
          status: TentativaStatus;
          motivo: string | null;
          criado_em: string;
          retry_em: string | null;
        }>;
      };

      conciliacao: {
        Row: {
          id: string;
          tenant_id: string;
          recorrencia_id: string;
          status: ConciliacaoStatus;
          observacao: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          recorrencia_id: string;
          status: ConciliacaoStatus;
          observacao?: string | null;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          recorrencia_id: string;
          status: ConciliacaoStatus;
          observacao: string | null;
        }>;
      };

      audit_log: {
        Row: {
          id: string;
          tenant_id: string;
          actor: string;
          acao: string;
          payload_hash: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          actor: string;
          acao: string;
          payload_hash: string;
          criado_em?: string;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          actor: string;
          acao: string;
          payload_hash: string;
          criado_em: string;
        }>;
      };

      // ─── MP Integration Tables (new — migration 0013) ────────────────────
      subscriptions: {
        Row: {
          id: string;
          pme_id: string;
          tenant_id: string;
          plano: string;
          provider: ProviderName;
          payment_method: PaymentMethod;
          status: SubscriptionStatus;
          provider_subscription_id: string | null;
          provider_customer_id: string | null;
          prox_cobranca: string | null;
          checkout_url: string | null;
          authorization_url: string | null;
          boleto_url: string | null;
          qr_code: string | null;
          qr_code_base64: string | null;
          vencimento: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pme_id: string;
          tenant_id: string;
          plano: string;
          provider: ProviderName;
          payment_method: PaymentMethod;
          status: SubscriptionStatus;
          provider_subscription_id?: string | null;
          provider_customer_id?: string | null;
          prox_cobranca?: string | null;
          checkout_url?: string | null;
          authorization_url?: string | null;
          boleto_url?: string | null;
          qr_code?: string | null;
          qr_code_base64?: string | null;
          vencimento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          pme_id: string;
          tenant_id: string;
          plano: string;
          provider: ProviderName;
          payment_method: PaymentMethod;
          status: SubscriptionStatus;
          provider_subscription_id: string | null;
          provider_customer_id: string | null;
          prox_cobranca: string | null;
          checkout_url: string | null;
          authorization_url: string | null;
          boleto_url: string | null;
          qr_code: string | null;
          qr_code_base64: string | null;
          vencimento: string | null;
          created_at: string;
          updated_at: string;
        }>;
      };

      partidas_abertas: {
        Row: {
          id: string;
          tenant_id: string;
          subscription_id: string;
          pme_id: string;
          plano: string;
          valor: number;
          vencimento: string;
          dias_vencido: number;
          status: 'aberta' | 'vencida' | 'paga' | 'cancelada';
          tipo: PaymentMethod;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          subscription_id: string;
          pme_id: string;
          plano: string;
          valor: number;
          vencimento: string;
          dias_vencido?: number;
          status: 'aberta' | 'vencida' | 'paga' | 'cancelada';
          tipo: PaymentMethod;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          subscription_id: string;
          pme_id: string;
          plano: string;
          valor: number;
          vencimento: string;
          dias_vencido: number;
          status: 'aberta' | 'vencida' | 'paga' | 'cancelada';
          tipo: PaymentMethod;
          created_at: string;
          updated_at: string;
        }>;
      };

      livro_razao: {
        Row: {
          id: string;
          tenant_id: string;
          subscription_id: string | null;
          pme_id: string;
          plano: string;
          valor: number;
          data: string;
          tipo: 'receita' | 'despesa' | 'ajuste';
          categoria: string;
          descricao: string;
          status: 'confirmada' | 'pendente' | 'estornada';
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          subscription_id?: string | null;
          pme_id: string;
          plano: string;
          valor: number;
          data: string;
          tipo: 'receita' | 'despesa' | 'ajuste';
          categoria: string;
          descricao: string;
          status: 'confirmada' | 'pendente' | 'estornada';
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          tenant_id: string;
          subscription_id: string | null;
          pme_id: string;
          plano: string;
          valor: number;
          data: string;
          tipo: 'receita' | 'despesa' | 'ajuste';
          categoria: string;
          descricao: string;
          status: 'confirmada' | 'pendente' | 'estornada';
          created_at: string;
        }>;
      };

      webhook_event: {
        Row: {
          id: string;
          evento_id: string;
          provider: ProviderName;
          tipo: string;
          subscription_id: string | null;
          processado_em: string | null;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          evento_id: string;
          provider: ProviderName;
          tipo: string;
          subscription_id?: string | null;
          processado_em?: string | null;
          payload: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          evento_id: string;
          provider: ProviderName;
          tipo: string;
          subscription_id: string | null;
          processado_em: string | null;
          payload: Record<string, unknown>;
          created_at: string;
        }>;
      };
    };
  };
}
