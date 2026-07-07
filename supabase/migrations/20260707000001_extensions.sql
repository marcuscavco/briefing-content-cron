-- Fase 0: extensões base + schema private (helpers não expostos pelo PostgREST)

create extension if not exists pgcrypto;
-- pgvector habilitado desde já: custo zero sem tabelas usando, e garante paridade
-- local/CI/prod antes das migrações de memória semântica (Fase 2).
-- No schema `extensions` (não `public`) — recomendação do linter do Supabase.
create extension if not exists vector with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
