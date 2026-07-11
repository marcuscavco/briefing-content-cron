-- Fase 2: regra do legado generalizada — agregadores/newsletters de curadoria
-- contam para o Heat mas NUNCA viram link de leitura (fallback).
-- No legado eram Hacker News e The News (Waffle), hardcoded; agora é atributo.

alter table public.sources add column fallback_eligible boolean not null default true;
alter table public.suggested_sources add column fallback_eligible boolean not null default true;

update public.suggested_sources
set fallback_eligible = false
where name in ('Hacker News');
