-- Assuntos como entidade central: estado de tendência por assunto.
-- Reaparecer COM novidade → boost de recorrência ("Em alta", pode promover
-- de categoria). Reaparecer SEM novidade → continua suprimido e acumula
-- decaimento (se voltar com novidade, volta mais frio). Boost/decay são
-- determinísticos (computeTrendBoost em packages/curation/src/heat.ts).

alter table public.topic_memory
  add column novelty_streak int not null default 1,          -- aparições consecutivas COM novidade
  add column stale_days     int not null default 0,          -- reaparições sem novidade desde a última novidade
  add column trend_score    real not null default 0,         -- último boost aplicado (auditoria/timeline)
  add column last_novel_at  timestamptz not null default now();

-- Backfill: assuntos existentes herdam last_seen_at como última novidade
-- (até hoje, toda gravação em topic_memory era uma novidade).
update public.topic_memory set last_novel_at = last_seen_at;

alter table public.clusters
  add column heat_boost real not null default 0,             -- bônus de recorrência aplicado ao heat (pode ser negativo)
  add column em_alta    boolean not null default false;      -- badge "Em alta" (boost ≥ 1)

-- match_topic_memory passa a devolver o estado de tendência — mudança de
-- return type exige drop + recreate (mesmo corpo + 3 colunas novas).
drop function public.match_topic_memory(uuid, extensions.vector(1024), float, int, int);

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
  novelty_streak int,
  stale_days int,
  last_novel_at timestamptz,
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
    tm.novelty_streak,
    tm.stale_days,
    tm.last_novel_at,
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
