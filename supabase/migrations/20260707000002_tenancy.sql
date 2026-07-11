-- Fase 0: raiz de tenancy — accounts + memberships + platform_admins + app_config

create type public.membership_role as enum ('owner', 'admin', 'member');

create table public.accounts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.membership_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

-- platform_admin NÃO é role de membership: tabela sem policies (invisível para
-- anon/authenticated). Só o service-role lê, e apenas em rotas server — o bypass
-- de RLS nunca acontece via policy.
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Config de plataforma em runtime (flags, kill-switches). Server-only: sem policies.
-- Branding NÃO vive aqui (é build-time, em packages/config/src/brand.ts).
create table public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.accounts        enable row level security;
alter table public.memberships     enable row level security;
alter table public.platform_admins enable row level security;
alter table public.app_config      enable row level security;

-- Projetos novos do Supabase não têm mais GRANT automático para anon/authenticated/
-- service_role em tabelas do public — conceder explicitamente (RLS continua
-- decidindo as LINHAS; o grant decide o ACESSO à tabela).
grant select, update              on public.accounts    to authenticated;
grant select                      on public.memberships to authenticated;
grant all                         on public.accounts, public.memberships,
                                     public.platform_admins, public.app_config
                                  to service_role;
-- anon: nenhum grant — toda rota de dados exige sessão; requests anônimos
-- recebem "permission denied" em vez de lista vazia.
-- platform_admins / app_config: sem grant para authenticated — invisíveis
-- mesmo antes de RLS (defesa em profundidade).
