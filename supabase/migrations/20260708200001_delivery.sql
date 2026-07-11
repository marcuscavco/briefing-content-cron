-- Fase 3: entrega — destinos WhatsApp verificados + delivery log.

-- ⚠️ PEGADINHA REAL portada do legado (PROMPT.md/context.md): o valor de `phone`
-- é usado LITERALMENTE no envio — match EXATO, sem normalização. Grupos usam o
-- sufixo `-group` (ex.: 120363426454255065-group), NUNCA o formato `@g.us`.
-- Não normalizar, não adicionar +55, não remover dígitos.

create table public.whatsapp_destinations (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.accounts(id) on delete cascade,
  profile_id              uuid not null references public.briefing_profiles(id) on delete cascade,
  kind                    text not null check (kind in ('personal', 'group')),
  phone                   text not null check (phone ~ '^[0-9]+(-group)?$'),
  label                   text,
  -- Double opt-in (brief §8): só destino verificado recebe briefing.
  verified                boolean not null default false,
  verification_code       text,
  verification_expires_at timestamptz,
  verification_attempts   int not null default 0,   -- tentativas de confirmação do código atual
  verification_sends      int not null default 0,   -- códigos enviados na última janela
  verification_window     timestamptz,               -- início da janela de rate-limit de envio
  verified_at             timestamptz,
  active                  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint whatsapp_dest_kind_shape check (
    (kind = 'group' and phone like '%-group') or (kind = 'personal' and phone not like '%-group')
  ),
  unique (profile_id, phone)
);

create index whatsapp_destinations_account_idx on public.whatsapp_destinations (account_id);
create index whatsapp_destinations_profile_idx on public.whatsapp_destinations (profile_id);

alter table public.whatsapp_destinations enable row level security;

-- Usuário gerencia os próprios destinos, MAS não pode se auto-verificar:
-- verified/verification_* só mudam via service role (server actions da
-- verificação). O update do cliente é restrito a label/active por trigger.
grant select, insert, update, delete on public.whatsapp_destinations to authenticated;
grant all on public.whatsapp_destinations to service_role;

create policy whatsapp_destinations_select on public.whatsapp_destinations
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

create policy whatsapp_destinations_insert on public.whatsapp_destinations
  for insert to authenticated
  with check (
    account_id in (select private.account_ids_for_user())
    and verified = false
  );

create policy whatsapp_destinations_update on public.whatsapp_destinations
  for update to authenticated
  using (account_id in (select private.account_ids_for_user()))
  with check (account_id in (select private.account_ids_for_user()));

create policy whatsapp_destinations_delete on public.whatsapp_destinations
  for delete to authenticated
  using (account_id in (select private.account_ids_for_user()));

-- Blindagem: cliente autenticado não altera o estado de verificação nem o phone
-- (mudou o número? apaga e verifica de novo). Service role passa direto.
create or replace function private.protect_whatsapp_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated' then
    if new.verified is distinct from old.verified
       or new.verification_code is distinct from old.verification_code
       or new.verification_expires_at is distinct from old.verification_expires_at
       or new.verification_attempts is distinct from old.verification_attempts
       or new.verification_sends is distinct from old.verification_sends
       or new.verification_window is distinct from old.verification_window
       or new.verified_at is distinct from old.verified_at
       or new.phone is distinct from old.phone
       or new.kind is distinct from old.kind then
      raise exception 'campos de verificação são gerenciados pela plataforma';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_whatsapp_verification
  before update on public.whatsapp_destinations
  for each row execute function private.protect_whatsapp_verification();

-- ── delivery_log ─────────────────────────────────────────────────────────────
create table public.delivery_log (
  id                bigint generated always as identity primary key,
  account_id        uuid not null references public.accounts(id) on delete cascade,
  briefing_id       uuid not null references public.briefings(id) on delete cascade,
  channel           text not null check (channel in ('email', 'whatsapp')),
  destination       text not null,   -- email ou phone literal
  status            text not null check (status in ('sent', 'failed', 'skipped_unverified', 'skipped_disabled')),
  provider_response jsonb,
  error             text,
  created_at        timestamptz not null default now()
);

-- Idempotência: retry de job não reenvia o que já foi 'sent'.
create unique index delivery_log_sent_uniq
  on public.delivery_log (briefing_id, channel, destination)
  where status = 'sent';
create index delivery_log_account_idx on public.delivery_log (account_id, created_at desc);
create index delivery_log_briefing_idx on public.delivery_log (briefing_id);

alter table public.delivery_log enable row level security;

grant select on public.delivery_log to authenticated;
grant all on public.delivery_log to service_role;

create policy delivery_log_select on public.delivery_log
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));

-- ── briefings: mensagens WhatsApp geradas (auditoria/reenvio, como o legado) ─
alter table public.briefings
  add column whatsapp_msg_1 text,
  add column whatsapp_msg_2 text;
