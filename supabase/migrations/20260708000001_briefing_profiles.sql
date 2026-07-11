-- Fase 1: briefing_profiles — o tema é do briefing, não da fonte.
-- v1 opera com 1 profile por account (criado por trigger), mas o modelo já
-- comporta múltiplos briefings por conta (quota por plano, Fase 6).

create table public.briefing_profiles (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  name            text not null default 'Briefing diário',
  -- Temas de interesse e exclusões (filtro aplicado sobre TODAS as fontes do profile)
  themes          text[] not null default '{}',
  excluded_themes text[] not null default '{}',
  delivery_time   time not null default '07:00',
  timezone        text not null default 'America/Sao_Paulo',
  channels        jsonb not null default '{"email": true, "whatsapp": false}'::jsonb,
  window_hours    int  not null default 48 check (window_hours between 6 and 168),
  max_posts_per_day int not null default 3 check (max_posts_per_day between 0 and 10),
  -- Ajustes do usuário sobre a voz default (herdada de references/voz.md)
  voice_overrides jsonb,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index briefing_profiles_account_id_idx on public.briefing_profiles (account_id);

alter table public.briefing_profiles enable row level security;

grant select, insert, update, delete on public.briefing_profiles to authenticated;
grant all on public.briefing_profiles to service_role;

create policy briefing_profiles_select on public.briefing_profiles
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy briefing_profiles_insert on public.briefing_profiles
  for insert to authenticated
  with check (private.has_account_role(account_id, array['owner','admin']::public.membership_role[]));

create policy briefing_profiles_update on public.briefing_profiles
  for update to authenticated
  using (account_id in (select private.account_ids_for_user()))
  with check (account_id in (select private.account_ids_for_user()));

create policy briefing_profiles_delete on public.briefing_profiles
  for delete to authenticated
  using (private.has_account_role(account_id, array['owner','admin']::public.membership_role[]));

-- Toda account nasce com um profile default (vale também para accounts criadas
-- pelo backoffice no futuro — o trigger é na tabela, não no signup).
create or replace function private.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.briefing_profiles (account_id) values (new.id);
  return new;
end;
$$;

create trigger on_account_created
  after insert on public.accounts
  for each row execute function private.handle_new_account();

-- Accounts existentes (criadas antes desta migração) ganham o profile default.
insert into public.briefing_profiles (account_id)
select a.id from public.accounts a
where not exists (select 1 from public.briefing_profiles p where p.account_id = a.id);
