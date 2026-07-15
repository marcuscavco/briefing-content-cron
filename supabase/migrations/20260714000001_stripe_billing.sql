-- Fase 6: billing com Stripe (Checkout + Portal + Webhooks).
-- Modelo comercial definitivo: sem plano gratuito — grátis apenas o primeiro
-- briefing gerado no onboarding; os diários exigem assinatura ativa (gate no
-- dispatchDueJobs). Dois planos mensais:
--   essencial R$37,90 — apenas fontes do catálogo (library)
--   pro       R$57,90 — portais personalizados + Instagram
--
-- Os stripe_price_id NÃO entram aqui: test e live mode têm ids diferentes.
-- Após criar os prices no Stripe, rodar por ambiente:
--   update public.plans set stripe_price_id = 'price_...' where id = 'essencial';
--   update public.plans set stripe_price_id = 'price_...' where id = 'pro';

-- ── Reforma dos planos ───────────────────────────────────────────────────────
update public.plans set active = false, updated_at = now() where id = 'free';

update public.plans set
  price_cents = 5790,
  description = 'Portais personalizados, Instagram e mais posts por dia',
  features    = '{"instagram": true, "custom_sources": true}'::jsonb,
  updated_at  = now()
where id = 'pro';

insert into public.plans (id, name, description, price_cents, max_sources, max_posts_per_day, features, sort_order)
values ('essencial', 'Essencial', 'Briefing diário com fontes do catálogo', 3790, 10, 3,
        '{"instagram": false, "custom_sources": false}'::jsonb, 10);

-- ── Customer do Stripe vive no account ───────────────────────────────────────
-- Quem nunca assinou não tem linha em subscriptions; o customer é criado no
-- primeiro checkout e reutilizado depois (inclusive após cancelar).
alter table public.accounts add column stripe_customer_id text unique;

-- ── Idempotência de webhooks ─────────────────────────────────────────────────
-- Stripe entrega at-least-once e fora de ordem; evento já visto = no-op.
create table public.stripe_events (
  id          text primary key,               -- evt_...
  type        text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
grant all on public.stripe_events to service_role;  -- sem policies: só service role

-- Chave de lookup do webhook ao sincronizar estado.
create index subscriptions_stripe_sub_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
