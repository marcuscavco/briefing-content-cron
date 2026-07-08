-- Fase 2: memória de longo prazo por account (dedupe semântico — dor nº 1).
-- Cada assunto entregue vira uma linha com embedding (voyage-3.5-lite, 1024 dims).
-- Regra na seleção: similar sem novidade → suprimir; similar com novidade →
-- "Atualização" (linka o briefing anterior); sem similar → novo.

create table public.topic_memory (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.accounts(id) on delete cascade,
  profile_id         uuid not null references public.briefing_profiles(id) on delete cascade,
  canonical_title    text not null,
  summary            text,
  entities           text[] not null default '{}',
  content_hash       text not null,          -- sha256 do conteúdo normalizado (dedupe exato)
  embedding          extensions.vector(1024) not null,
  appearances        int not null default 1,
  first_briefing_id  uuid references public.briefings(id) on delete set null,
  last_briefing_id   uuid references public.briefings(id) on delete set null,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now()
);

create index topic_memory_profile_idx on public.topic_memory (profile_id, last_seen_at desc);
create index topic_memory_hash_idx on public.topic_memory (profile_id, content_hash);
-- HNSW para busca por similaridade de cosseno (janela de memória por profile é
-- pequena o suficiente para HNSW ser tranquilo de manter)
create index topic_memory_embedding_idx on public.topic_memory
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.clusters
  add constraint clusters_topic_memory_fk
  foreign key (topic_memory_id) references public.topic_memory(id) on delete set null;

alter table public.topic_memory enable row level security;

grant select on public.topic_memory to authenticated;  -- timeline de assunto (Fase 4)
grant all on public.topic_memory to service_role;

create policy topic_memory_select on public.topic_memory
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

-- Busca vetorial usada pelo pipeline (service role). Vive em `public` porque o
-- PostgREST só expõe RPCs de schemas expostos — mas o execute é revogado de
-- anon/authenticated (só o worker chama). memory_window_days limita a janela
-- (controle de custo/ruído do brief §6.4).
create or replace function public.match_topic_memory(
  p_profile_id uuid,
  p_embedding extensions.vector(1024),
  p_threshold float default 0.80,
  p_count int default 5,
  p_window_days int default 90
)
returns table (
  id uuid,
  canonical_title text,
  summary text,
  last_briefing_id uuid,
  last_seen_at timestamptz,
  appearances int,
  similarity float
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    tm.id,
    tm.canonical_title,
    tm.summary,
    tm.last_briefing_id,
    tm.last_seen_at,
    tm.appearances,
    1 - (tm.embedding operator(extensions.<=>) p_embedding) as similarity
  from public.topic_memory tm
  where tm.profile_id = p_profile_id
    and tm.last_seen_at >= now() - make_interval(days => p_window_days)
    and 1 - (tm.embedding operator(extensions.<=>) p_embedding) >= p_threshold
  order by tm.embedding operator(extensions.<=>) p_embedding
  limit p_count;
$$;

revoke execute on function public.match_topic_memory(uuid, extensions.vector(1024), float, int, int) from public, anon, authenticated;
grant execute on function public.match_topic_memory(uuid, extensions.vector(1024), float, int, int) to service_role;
