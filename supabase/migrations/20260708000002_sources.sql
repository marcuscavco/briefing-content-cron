-- Fase 1: fontes por briefing profile + health tracking por fonte.

create type public.source_type as enum ('rss', 'web', 'instagram');
create type public.source_health_status as enum ('pending', 'ok', 'partial', 'blocked', 'error');

create table public.sources (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.accounts(id) on delete cascade,
  profile_id     uuid not null references public.briefing_profiles(id) on delete cascade,
  name           text not null,
  type           public.source_type not null default 'rss',
  -- url = homepage/base (URLs limpas na entrega); feed_url = RSS/Atom; handle = @perfil IG
  url            text not null,
  feed_url       text,
  handle         text,
  tier           smallint not null check (tier between 1 and 3),
  active         boolean not null default true,
  -- Credencial cifrada server-side (AES-256-GCM, chave em env — nunca exposta ao cliente)
  credential_enc text,
  -- Health agregado (últimos eventos detalhados em source_health_events)
  last_status     public.source_health_status not null default 'pending',
  last_error      text,
  last_checked_at timestamptz,
  last_ok_at      timestamptz,
  -- Preview da última validação: [{title, url, publishedAt}] (máx ~5 itens)
  last_preview    jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- rss SEM feed_url é válido: fonte em modo parcial (cascata tenta redescobrir
  -- o feed a cada execução). Só Instagram exige handle.
  constraint sources_shape check (type <> 'instagram' or handle is not null)
);

create index sources_account_id_idx on public.sources (account_id);
create index sources_profile_id_idx on public.sources (profile_id);
-- Evita fonte duplicada no mesmo profile (pela identidade relevante de cada tipo)
create unique index sources_profile_identity_uniq
  on public.sources (profile_id, lower(coalesce(feed_url, handle, url)));

create table public.source_health_events (
  id          bigint generated always as identity primary key,
  source_id   uuid not null references public.sources(id) on delete cascade,
  account_id  uuid not null references public.accounts(id) on delete cascade,
  status      public.source_health_status not null,
  method      text,          -- 'rss' | 'feed_discovery' | 'web_extract' | 'title_only'
  latency_ms  int,
  items_found int,
  error       text,
  created_at  timestamptz not null default now()
);

create index source_health_events_source_idx on public.source_health_events (source_id, created_at desc);
create index source_health_events_account_idx on public.source_health_events (account_id);

alter table public.sources enable row level security;
alter table public.source_health_events enable row level security;

grant select, insert, update, delete on public.sources to authenticated;
grant select, insert on public.source_health_events to authenticated;
grant all on public.sources, public.source_health_events to service_role;

create policy sources_select on public.sources
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy sources_insert on public.sources
  for insert to authenticated
  with check (account_id in (select private.account_ids_for_user()));

create policy sources_update on public.sources
  for update to authenticated
  using (account_id in (select private.account_ids_for_user()))
  with check (account_id in (select private.account_ids_for_user()));

create policy sources_delete on public.sources
  for delete to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy source_health_events_select on public.source_health_events
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

-- Eventos de health são gravados pela validação server-side rodando com a
-- sessão do usuário — insert permitido dentro da própria account.
create policy source_health_events_insert on public.source_health_events
  for insert to authenticated
  with check (account_id in (select private.account_ids_for_user()));
