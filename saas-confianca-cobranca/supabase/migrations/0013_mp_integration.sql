-- Migration 0013: MP Integration (Pix Automático + Cartão + Boleto + PIX QR)
-- Extends MVP schema (0001-0012) with MP-specific tables.
-- Ref: PLANO CONJUNTO §2.2 (A-1 through A-10)

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ subscriptions                                                       │
-- │ Tracks MP subscriptions across all 4 payment methods.               │
-- └─────────────────────────────────────────────────────────────────────┘
create table if not exists subscriptions (
  id              uuid    primary key default gen_random_uuid(),
  pme_id          text    not null,
  tenant_id       uuid    not null references tenants(id) on delete cascade,
  plano           text    not null,
  provider        text    not null default 'mercadopago',
  payment_method  text    not null check (payment_method in ('pix_auto', 'credit_card', 'boleto', 'pix_qr')),
  status          text    not null default 'pending' check (status in ('active', 'failed', 'grace', 'canceled', 'suspended', 'pending')),
  provider_subscription_id text,
  provider_customer_id     text,
  prox_cobranca   timestamptz,
  checkout_url    text,       -- for credit_card redirect
  authorization_url text,     -- for pix_auto
  boleto_url      text,       -- for boleto
  qr_code         text,       -- for pix_qr
  qr_code_base64  text,       -- for pix_qr
  vencimento      timestamptz, -- for boleto/pix_qr
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS: tenant isolation
alter table subscriptions enable row level security;
create policy "tenant can read own subscriptions" on subscriptions
  for all using (tenant_id = auth.uid()::uuid);

-- Indexes
create index if not exists idx_subscriptions_pme_id on subscriptions(pme_id);
create index if not exists idx_subscriptions_provider_sub_id on subscriptions(provider_subscription_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_subscriptions_payment_method on subscriptions(payment_method);
create index if not exists idx_subscriptions_tenant_pme on subscriptions(tenant_id, pme_id);

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ partidas_abertas                                                    │
-- │ Contas a receber em aberto (contabilidade).                         │
-- └─────────────────────────────────────────────────────────────────────┘
create table if not exists partidas_abertas (
  id              uuid    primary key default gen_random_uuid(),
  tenant_id       uuid    not null references tenants(id) on delete cascade,
  subscription_id uuid    references subscriptions(id) on delete set null,
  pme_id          text    not null,
  plano           text    not null,
  valor           numeric(10,2) not null,
  vencimento      timestamptz not null,
  dias_vencido    integer not null default 0,
  status          text    not null default 'aberta' check (status in ('aberta', 'vencida', 'paga', 'cancelada')),
  tipo            text    not null check (tipo in ('pix_auto', 'credit_card', 'boleto', 'pix_qr')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table partidas_abertas enable row level security;
create policy "tenant can read own partidas" on partidas_abertas
  for all using (tenant_id = auth.uid()::uuid);

create index if not exists idx_partidas_tenant on partidas_abertas(tenant_id);
create index if not exists idx_partidas_status on partidas_abertas(status);
create index if not exists idx_partidas_vencimento on partidas_abertas(vencimento);
create index if not exists idx_partidas_subscription on partidas_abertas(subscription_id);

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ livro_razao                                                         │
-- │ Contabilidade por trás (partidas a receber).                        │
-- └─────────────────────────────────────────────────────────────────────┘
create table if not exists livro_razao (
  id              uuid    primary key default gen_random_uuid(),
  tenant_id       uuid    not null references tenants(id) on delete cascade,
  subscription_id uuid    references subscriptions(id) on delete set null,
  pme_id          text    not null,
  plano           text    not null,
  valor           numeric(10,2) not null,
  data            date    not null,
  tipo            text    not null check (tipo in ('receita', 'despesa', 'ajuste')),
  categoria       text    not null,
  descricao       text,
  status          text    not null default 'confirmada' check (status in ('confirmada', 'pendente', 'estornada')),
  created_at      timestamptz not null default now()
);

alter table livro_razao enable row level security;
create policy "tenant can read own livro_razao" on livro_razao
  for all using (tenant_id = auth.uid()::uuid);

create index if not exists idx_livro_razao_tenant on livro_razao(tenant_id);
create index if not exists idx_livro_razao_data on livro_razao(data);
create index if not exists idx_livro_razao_tipo on livro_razao(tipo);
create index if not exists idx_livro_razao_subscription on livro_razao(subscription_id);

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ webhook_event                                                       │
-- │ Idempotência de webhook: garante que um evento não seja processado  │
-- │ duas vezes.                                                         │
-- └─────────────────────────────────────────────────────────────────────┘
create table if not exists webhook_event (
  id              uuid    primary key default gen_random_uuid(),
  evento_id       text    not null,           -- unique event id from provider
  provider        text    not null default 'mercadopago',
  tipo            text    not null,           -- normalized event type
  subscription_id uuid    references subscriptions(id) on delete set null,
  processado_em   timestamptz,
  payload         jsonb   not null,
  created_at      timestamptz not null default now()
);

alter table webhook_event enable row level security;
create policy "tenant can read own webhook_events" on webhook_event
  for all using (true);  -- webhook events are processed by service role

-- Unique constraint: idempotência por evento_id
create unique index if not exists idx_webhook_evento_id_unique on webhook_event(evento_id);
create index if not exists idx_webhook_subscription on webhook_event(subscription_id);
create index if not exists idx_webhook_processado on webhook_event(processado_em);

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ Triggers                                                            │
-- └─────────────────────────────────────────────────────────────────────┘

-- Auto-update updated_at on subscriptions
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

create trigger trg_partidas_updated_at
  before update on partidas_abertas
  for each row execute function update_updated_at();

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ Views                                                               │
-- └─────────────────────────────────────────────────────────────────────┘

-- View: partidas em aberto por tenant (para dashboard PME)
create or replace view v_partidas_abertas as
select
  pa.id,
  pa.tenant_id,
  pa.subscription_id,
  pa.pme_id,
  pa.plano,
  pa.valor,
  pa.vencimento,
  pa.dias_vencido,
  pa.status,
  pa.tipo,
  pa.created_at,
  pa.updated_at,
  s.provider,
  s.payment_method
from partidas_abertas pa
left join subscriptions s on s.id = pa.subscription_id
where pa.status in ('aberta', 'vencida');

-- View: resumo de contabilidade por tenant
create or replace view v_livro_resumo as
select
  lr.tenant_id,
  lr.data,
  sum(lr.valor) filter (where lr.tipo = 'receita' and lr.status = 'confirmada') as receita_confirmada,
  sum(lr.valor) filter (where lr.tipo = 'receita' and lr.status = 'pendente') as receita_pendente,
  sum(lr.valor) filter (where lr.tipo = 'despesa' and lr.status = 'confirmada') as despesa_confirmada,
  count(*) filter (where lr.tipo = 'receita' and lr.status = 'confirmada') as total_receitas
from livro_razao lr
group by lr.tenant_id, lr.data;
