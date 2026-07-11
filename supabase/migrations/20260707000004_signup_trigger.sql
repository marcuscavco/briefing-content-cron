-- Fase 0: signup → cria account + membership owner automaticamente.
-- v1: 1 user = 1 account, mas o modelo (memberships N:N) já comporta times.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_account_id uuid;
begin
  insert into public.accounts (name)
  values (
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  returning id into new_account_id;

  insert into public.memberships (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
