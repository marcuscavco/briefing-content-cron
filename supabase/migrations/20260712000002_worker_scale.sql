-- Fase A (escalabilidade): suporte a workers concorrentes + UX de atraso +
-- unicidade de telefone daqui pra frente.

-- 1. Progresso do job em um único UPDATE atômico. Substitui o read-modify-write
--    de stage_log/tokens no worker, que perdia entradas com N workers em paralelo.
create or replace function public.append_job_progress(
  p_job_id uuid,
  p_entry jsonb,
  p_tokens_in bigint,
  p_tokens_out bigint,
  p_cost numeric
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jobs
  set stage_log = stage_log || jsonb_build_array(p_entry),
      tokens_input = tokens_input + p_tokens_in,
      tokens_output = tokens_output + p_tokens_out,
      cost_usd = cost_usd + p_cost
  where id = p_job_id;
$$;

revoke execute on function public.append_job_progress(uuid, jsonb, bigint, bigint, numeric)
  from public, anon, authenticated;
grant execute on function public.append_job_progress(uuid, jsonb, bigint, bigint, numeric)
  to service_role;

-- 2. Rate-limit da API agora devolve o job à fila (checkpoint preservado) em vez
--    de dormir no orçamento do tick — mais tentativas são esperadas e baratas.
alter table public.jobs alter column max_attempts set default 5;

-- 3. Dedupe do aviso de atraso no WhatsApp (1 aviso por job/dia).
alter table public.jobs add column if not exists late_notified_at timestamptz;

-- 4. Unicidade de telefone entre contas — SÓ para novos cadastros (INSERT).
--    Linhas duplicadas existentes (contas de teste) permanecem válidas; update de
--    phone já é bloqueado pelo trigger protect_whatsapp_verification.
create or replace function private.reject_cross_account_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.whatsapp_destinations d
    where d.phone = new.phone and d.account_id <> new.account_id
  ) then
    raise exception 'phone_already_registered'
      using hint = 'Este número de WhatsApp já está cadastrado em outra conta.';
  end if;
  return new;
end;
$$;

drop trigger if exists whatsapp_dest_unique_phone on public.whatsapp_destinations;
create trigger whatsapp_dest_unique_phone
  before insert on public.whatsapp_destinations
  for each row execute function private.reject_cross_account_phone();
