-- Fase 4: planos + assinaturas mínimos (backoffice antecipado da Fase 6).
-- A concessão manual (source = 'admin_grant') nasce agora; a Fase 6 só pluga o
-- Stripe (source = 'stripe' + colunas stripe_*) sem mudar o modelo.

create table public.plans (
  id              text primary key,          -- 'free' | 'pro' | ...
  name            text not null,
  description     text,
  price_cents     int not null default 0,
  currency        text not null default 'BRL',
  max_sources     int not null default 10,
  max_posts_per_day int not null default 3,
  features        jsonb not null default '{}'::jsonb,
  stripe_price_id text,                      -- preenchido na Fase 6
  active          boolean not null default true,
  sort_order      int not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.plans enable row level security;
grant select on public.plans to authenticated;
grant all on public.plans to service_role;

create policy plans_select on public.plans
  for select to authenticated
  using (active);

create type public.subscription_source as enum ('admin_grant', 'stripe');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled');

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null references public.accounts(id) on delete cascade,
  plan_id                text not null references public.plans(id),
  status                 public.subscription_status not null default 'active',
  source                 public.subscription_source not null,
  granted_by             uuid references auth.users(id) on delete set null,  -- admin da concessão
  notes                  text,
  stripe_customer_id     text,               -- Fase 6
  stripe_subscription_id text,               -- Fase 6
  current_period_start   timestamptz not null default now(),
  current_period_end     timestamptz,        -- null = sem expiração (grant manual)
  canceled_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- No máximo UMA assinatura vigente por account.
create unique index subscriptions_active_uniq
  on public.subscriptions (account_id)
  where status in ('active', 'trialing');
create index subscriptions_account_idx on public.subscriptions (account_id, created_at desc);

alter table public.subscriptions enable row level security;

-- Usuário vê a própria assinatura; escrita é só da plataforma (backoffice via
-- service role hoje; webhooks do Stripe na Fase 6).
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

-- ── Seed de planos (valores iniciais; Fase 6 refina preço/limites) ──────────
insert into public.plans (id, name, description, price_cents, max_sources, max_posts_per_day, sort_order)
values
  ('free', 'Grátis', 'Briefing diário com até 10 fontes', 0, 10, 3, 10),
  ('pro', 'Pro', 'Universo completo de fontes e mais posts por dia', 9900, 40, 5, 20);
