-- Scoring 🎯/⚡ (decisão 2026-07-12): a nota da IA passa a ser relativa aos
-- TEMAS do briefing (relevancia_tema) + impacto intrínseco do fato
-- (impacto_geral). As colunas antigas relevancia_tecnica/relevancia_empresarial
-- ficam como legado (briefings históricos as têm; novos gravam null nelas) —
-- os renderers fazem fallback.

alter table public.clusters
  add column if not exists relevancia_tema smallint
    check (relevancia_tema between 0 and 3),
  add column if not exists impacto_geral smallint
    check (impacto_geral between 0 and 3);
