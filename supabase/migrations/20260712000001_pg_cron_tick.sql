-- Fase A (escalabilidade): scheduler no banco. O Vercel Cron Hobby só dispara
-- 1x/dia; pg_cron chama o /api/cron/tick a cada minuto via pg_net, de graça.
-- O cron diário do vercel.json permanece como fallback.
--
-- Secrets ficam no Supabase Vault (NUNCA na migração):
--   select vault.create_secret('<CRON_SECRET da Vercel>', 'cron_secret');
--   select vault.create_secret('https://briefing-saas-weld.vercel.app/api/cron/tick', 'tick_url');
-- Sem os dois secrets, invoke_tick() é no-op silencioso — o schedule pode
-- existir antes da configuração sem gerar erro por minuto.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function private.invoke_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_url text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'cron_secret';
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'tick_url';
  if v_secret is null or v_url is null then
    return; -- vault ainda não configurado
  end if;

  -- fire-and-forget: pg_net enfileira a request; o tick tem seu próprio
  -- orçamento de tempo e auth via Bearer.
  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke execute on function private.invoke_tick() from public, anon, authenticated;

-- idempotente: unschedule se já existir (re-run da migração em dev)
do $$
begin
  perform cron.unschedule('briefing-tick');
exception when others then
  null; -- job ainda não existe
end;
$$;

select cron.schedule('briefing-tick', '* * * * *', $$select private.invoke_tick()$$);
