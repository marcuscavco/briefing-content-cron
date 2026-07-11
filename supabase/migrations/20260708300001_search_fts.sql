-- Fase 4: busca full-text no histórico de briefings.
-- Coluna gerada + GIN em clusters (titulo + resumo), config 'portuguese'.
-- A busca do usuário vai por PostgREST/textSearch com a RLS normal de clusters —
-- nenhuma RPC nova; a busca semântica reusa match_topic_memory (admin client
-- após requireTenant, sempre com o profile_id do próprio tenant).

alter table public.clusters
  add column fts tsvector generated always as (
    to_tsvector('portuguese', coalesce(titulo, '') || ' ' || coalesce(resumo, ''))
  ) stored;

create index clusters_fts_idx on public.clusters using gin (fts);
