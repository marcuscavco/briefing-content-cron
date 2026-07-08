-- Fase 2: domínio de curadoria — briefings, clusters, posts.
-- Evolução do schema legado (context.md §4) SEM as colunas DEPRECATED, com
-- account_id/profile_id + RLS em tudo. Escrita é exclusiva do pipeline
-- (service role); usuário autenticado só lê o que é da própria account.

create type public.cluster_category as enum (
  'must_read', 'relevante', 'no_radar', 'sinal_sem_fonte', 'descartado', 'suprimido'
);

create table public.briefings (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts(id) on delete cascade,
  profile_id        uuid not null references public.briefing_profiles(id) on delete cascade,
  run_date          date not null,
  executed_at       timestamptz not null default now(),
  n_clusters_total  int not null default 0,
  n_must_read       int not null default 0,
  n_relevante       int not null default 0,
  n_no_radar        int not null default 0,
  n_sinal_sem_fonte int not null default 0,
  n_updates         int not null default 0,  -- clusters reintroduzidos como "Atualização"
  n_suppressed      int not null default 0,  -- assuntos suprimidos pela memória
  n_posts           int not null default 0,
  n_posts_skipped   int not null default 0,
  -- Relatório de execução (etapa 9): por fonte, inacessíveis, promoções, tokens
  notas             jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (profile_id, run_date)
);

create index briefings_account_idx on public.briefings (account_id, run_date desc);

create table public.clusters (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null references public.accounts(id) on delete cascade,
  briefing_id            uuid not null references public.briefings(id) on delete cascade,
  ordem                  int not null,
  titulo                 text not null,
  fonte                  text,          -- portal canônico (ou fallback)
  url                    text,          -- URL limpa, sem parâmetros de proxy
  data_publicacao        date,
  resumo                 text,
  categoria              public.cluster_category not null,
  heat_score             int not null default 0,
  relevancia_tecnica     smallint check (relevancia_tecnica between 0 and 3),
  relevancia_empresarial smallint check (relevancia_empresarial between 0 and 3),
  tier_fonte             smallint,      -- 1 | 2 | null (sinal sem fonte)
  is_fallback            boolean not null default false,
  is_curator_pick        boolean not null default false,
  curator_pick_motivo    text,
  portais_cobrindo       jsonb not null default '[]'::jsonb,
  itens                  jsonb not null default '[]'::jsonb, -- [{title,url,portal,publishedAt}]
  -- Memória entre briefings (Fase 2 — dor nº 1 do brief)
  is_update              boolean not null default false,
  update_resumo          text,          -- o que mudou desde a última aparição
  previous_briefing_id   uuid references public.briefings(id) on delete set null,
  topic_memory_id        uuid,          -- FK adicionada na migração topic_memory
  created_at             timestamptz not null default now()
);

create index clusters_briefing_idx on public.clusters (briefing_id, ordem);
create index clusters_account_idx on public.clusters (account_id);

create table public.posts (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null references public.accounts(id) on delete cascade,
  briefing_id            uuid not null references public.briefings(id) on delete cascade,
  cluster_id             uuid references public.clusters(id) on delete cascade,
  ordem                  int not null,
  formato                text,          -- 'Reels' | 'Carrossel' | 'Infográfico' | 'Post longo' | 'Vídeo longo'
  justificativa_formato  text,
  gancho                 text,
  estrutura              jsonb,         -- [{"slide":1,"texto":"..."}]
  cta                    text,
  angulo_tipo            text,          -- 'traducao_empresario' | 'checklist' | ...
  angulo_descricao       text,
  skip                   boolean not null default false,
  skip_motivo            text,
  created_at             timestamptz not null default now()
);

create index posts_briefing_idx on public.posts (briefing_id, ordem);
create index posts_account_idx on public.posts (account_id);

alter table public.briefings enable row level security;
alter table public.clusters  enable row level security;
alter table public.posts     enable row level security;

grant select on public.briefings, public.clusters, public.posts to authenticated;
grant all on public.briefings, public.clusters, public.posts to service_role;

create policy briefings_select on public.briefings
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy clusters_select on public.clusters
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy posts_select on public.posts
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));
