-- Fase 2: fila de jobs do motor de curadoria (ADR: "o engine agenda e executa
-- estágios; ele nunca é dono do estado"). Vercel Cron chama o tick; o tick
-- enfileira jobs devidos e processa com claim FOR UPDATE SKIP LOCKED.
-- Nota de design: job_runs do brief §9 foi absorvido em `jobs` (stage_log +
-- tokens/custo por job) — volume v1 não justifica duas tabelas.

create type public.job_status as enum ('queued', 'running', 'done', 'failed');

create table public.jobs (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  profile_id    uuid not null references public.briefing_profiles(id) on delete cascade,
  type          text not null default 'daily_briefing',
  status        public.job_status not null default 'queued',
  stage         text not null default 'collect',   -- checkpoint: estágio a executar
  run_date      date not null,
  payload       jsonb not null default '{}'::jsonb,
  checkpoint    jsonb not null default '{}'::jsonb, -- estado intermediário entre estágios
  result        jsonb,                              -- resumo final (briefing_id, contagens)
  stage_log     jsonb not null default '[]'::jsonb, -- [{stage, ms, tokens_in, tokens_out, error?}]
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  run_at        timestamptz not null default now(),
  locked_at     timestamptz,
  locked_by     text,
  error         text,
  tokens_input  bigint not null default 0,
  tokens_output bigint not null default 0,
  cost_usd      numeric(12, 6) not null default 0,
  finished_at   timestamptz,
  created_at    timestamptz not null default now(),
  -- Idempotência diária: 1 job por profile/tipo/dia
  unique (profile_id, type, run_date)
);

create index jobs_claim_idx on public.jobs (status, run_at) where status = 'queued';
create index jobs_account_idx on public.jobs (account_id, created_at desc);

alter table public.jobs enable row level security;

-- Usuário lê os próprios jobs (painel de uso) e pode enfileirar o do dia
-- ("gerar agora"); execução/atualização é só do worker (service role).
grant select, insert on public.jobs to authenticated;
grant all on public.jobs to service_role;

create policy jobs_select on public.jobs
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy jobs_insert on public.jobs
  for insert to authenticated
  with check (account_id in (select private.account_ids_for_user()));

-- Claim atômico: pega o job queued mais antigo devido, marca running.
-- Em `public` (PostgREST só expõe schemas expostos), execute só para service_role.
create or replace function public.claim_next_job(p_worker text)
returns setof public.jobs
language sql
security definer
set search_path = ''
as $$
  update public.jobs j
  set status = 'running',
      locked_at = now(),
      locked_by = p_worker,
      attempts = j.attempts + 1
  where j.id = (
    select id from public.jobs
    where status = 'queued' and run_at <= now()
    order by run_at
    limit 1
    for update skip locked
  )
  returning j.*;
$$;

-- Devolve à fila jobs travados há mais de 20 min (worker morreu no meio);
-- estoura max_attempts → failed.
create or replace function public.requeue_stale_jobs()
returns int
language sql
security definer
set search_path = ''
as $$
  with stale as (
    update public.jobs
    set status = case when attempts >= max_attempts then 'failed'::public.job_status
                      else 'queued'::public.job_status end,
        error = case when attempts >= max_attempts
                     then coalesce(error, 'worker não concluiu (stale)') else error end,
        locked_at = null,
        locked_by = null
    where status = 'running' and locked_at < now() - interval '20 minutes'
    returning 1
  )
  select count(*)::int from stale;
$$;

revoke execute on function public.claim_next_job(text) from public, anon, authenticated;
revoke execute on function public.requeue_stale_jobs() from public, anon, authenticated;
grant execute on function public.claim_next_job(text) to service_role;
grant execute on function public.requeue_stale_jobs() to service_role;
