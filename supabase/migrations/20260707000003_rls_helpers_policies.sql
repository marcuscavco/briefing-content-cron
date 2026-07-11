-- Fase 0: helpers de RLS + policies canônicas.
--
-- PADRÃO CANÔNICO para toda tabela tenant futura (sources, briefings, clusters, ...):
--
--   alter table public.<tabela> enable row level security;
--   create policy <tabela>_select on public.<tabela> for select to authenticated
--     using (account_id in (select private.account_ids_for_user()));
--   -- insert/update/delete: mesmo predicado em using/with check, ou
--   -- private.has_account_role(account_id, array['owner','admin']::public.membership_role[])
--
-- O wrap em `(select ...)` faz o planner tratar como InitPlan (executa 1x por
-- statement, não por linha). SECURITY DEFINER nos helpers quebra a recursão
-- policy-de-memberships → consulta-memberships.

create or replace function private.account_ids_for_user()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select account_id
  from public.memberships
  where user_id = auth.uid();
$$;

create or replace function private.has_account_role(
  p_account_id uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where account_id = p_account_id
      and user_id = auth.uid()
      and role = any (p_roles)
  );
$$;

grant execute on function private.account_ids_for_user() to authenticated;
grant execute on function private.has_account_role(uuid, public.membership_role[]) to authenticated;

-- accounts: membro vê a própria account; owner/admin edita; criação/exclusão
-- nunca parte do cliente (criação = trigger de signup; exclusão = fluxo LGPD futuro
-- via rota server + service role).
create policy accounts_select on public.accounts
  for select to authenticated
  using (id in (select private.account_ids_for_user()));

create policy accounts_update on public.accounts
  for update to authenticated
  using (private.has_account_role(id, array['owner','admin']::public.membership_role[]))
  with check (private.has_account_role(id, array['owner','admin']::public.membership_role[]));

-- memberships: membro enxerga os membros da própria account. Nenhuma escrita
-- client-side no v1 (1 user = 1 account); convites de time virão por rota server.
create policy memberships_select on public.memberships
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

-- platform_admins e app_config: sem policies de propósito (só service role).
