-- Encurtador bnrd.me (decisão 2026-07-13): URLs de notícia ocupavam demais o
-- limite de 1500 chars do WhatsApp. Cada link entregue vira bnrd.me/<code>,
-- que registra o clique (analytics de engajamento) e redireciona (302) para a
-- URL real. LGPD-light: só timestamp, user-agent e referer — sem IP.

create table public.short_links (
  code         text primary key,                 -- base62 curto (gerado no worker)
  target_url   text not null,
  kind         text not null default 'news',     -- news | panel
  account_id   uuid references public.accounts(id) on delete set null,
  briefing_id  uuid references public.briefings(id) on delete set null,
  clicks       int not null default 0,
  last_click_at timestamptz,
  created_at   timestamptz not null default now()
);

create index short_links_briefing_idx on public.short_links (briefing_id);
create index short_links_account_idx on public.short_links (account_id, created_at desc);

create table public.link_clicks (
  id         bigint generated always as identity primary key,
  code       text not null references public.short_links(code) on delete cascade,
  clicked_at timestamptz not null default now(),
  user_agent text,
  referer    text
);

create index link_clicks_code_idx on public.link_clicks (code, clicked_at desc);

alter table public.short_links enable row level security;
alter table public.link_clicks enable row level security;

-- Usuário pode ler os links/contadores da própria conta (CTR no dashboard futuro);
-- escrita e cliques são só do server (service role).
grant select on public.short_links to authenticated;
create policy short_links_select on public.short_links
  for select to authenticated
  using (account_id in (select private.account_ids_for_user()));
grant all on public.short_links to service_role;
grant all on public.link_clicks to service_role;

-- Resolve + registra o clique em uma ida ao banco. NULL = código inexistente.
create or replace function public.resolve_short_link(
  p_code text,
  p_user_agent text,
  p_referer text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target text;
begin
  update public.short_links
  set clicks = clicks + 1, last_click_at = now()
  where code = p_code
  returning target_url into v_target;

  if v_target is null then
    return null;
  end if;

  insert into public.link_clicks (code, user_agent, referer)
  values (p_code, left(p_user_agent, 300), left(p_referer, 300));

  return v_target;
end;
$$;

revoke execute on function public.resolve_short_link(text, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_short_link(text, text, text) to service_role;
