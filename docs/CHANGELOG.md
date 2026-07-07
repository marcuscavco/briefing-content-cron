# CHANGELOG

## Fase 1 — Fontes, temas & ingestão resiliente (2026-07-08)

### Adicionado
- **`briefing_profiles`** (decisão de produto pós-Fase 0): o **tema pertence ao
  briefing, não à fonte**. Cada account nasce com um profile default (trigger);
  o modelo já comporta múltiplos briefings por conta (quota por plano na Fase 6).
  Configurações: temas de interesse + exclusões, horário/timezone de entrega,
  canais, janela de coleta, limite de posts.
- **`sources`** por profile com tiers 1/2/3 + **`source_health_events`**:
  status agregado (ok/parcial/bloqueado/erro), preview da última validação,
  credencial de feed de assinante cifrada (AES-256-GCM, chave server-only).
- **`suggested_sources`**: biblioteca curada global (32 fontes — portais BR
  gratuitos e confiáveis em destaque + universo atual do `fontes.md`), leitura
  para qualquer usuário, escrita só pela plataforma (backoffice na Fase 4).
- **`packages/ingestion`**: interface `SourceConnector` com `RssConnector`
  (cascata: feed conhecido → descoberta de feed na homepage → extração de
  conteúdo → só-título; parser RSS/Atom/RDF portado do worker `rss-mcp`),
  `WebConnector` (readability simplificada) e `InstagramConnector` (stub Fase 5).
  Transporte plugável: Worker `rss-proxy` em produção, fetch direto em dev.
  13 testes unitários (parser + cascata).
- **UI**: página `/sources` (fontes com badges de health, revalidação, pausa,
  biblioteca com adição em 1 clique, formulário custom com validação na hora e
  preview) e `/settings` (temas primeiro — ordem de onboarding tema → fontes).
- 10 novos testes de RLS (profiles/sources/health isolados; catálogo legível e
  não-gravável). Total: 20.

### Decisões
- Fonte `rss` sem `feed_url` é válida (modo parcial; a cascata tenta redescobrir
  o feed a cada execução) — só Instagram exige `handle`.
- Portal bloqueado NÃO derruba o fluxo: fonte fica `blocked` com health event e
  a validação reporta com clareza (aceite da fase verificado com smoke E2E).

### Fora de escopo (por quê)
- Rate-limit/abuse na validação de fontes: Fase 7 (hardening).
- Alertas de fonte consistentemente inacessível: precisa do job diário (Fase 2)
  para ter série histórica — o schema de `source_health_events` já suporta.

### Como testar
```bash
pnpm --filter @briefing/ingestion test        # parser + cascata
pnpm vitest run --config supabase/tests/vitest.config.ts   # 20 testes RLS
pnpm --filter web dev   # /settings (temas) e /sources (biblioteca + custom)
```

## Fase 0 — Arquitetura & scaffolding (2026-07-07)

**Fundação do SaaS multi-tenant, sem tocar no cron legado** (raiz do repo e
`workers/` permanecem intactos; a Remote Routine continua operando).

### Adicionado
- Monorepo pnpm workspaces: `apps/web` (Next.js 16 App Router + TS + Tailwind 4 +
  shadcn/ui), `packages/config` (branding placeholder centralizado),
  `packages/db` (clients Supabase browser/server/admin com fronteira
  `server-only` para a service key), `packages/curation` (stub para Fases 1-2).
- Projeto Supabase novo `briefing-saas` (`sndfxszrpbpgvjtwrmio`, sa-east-1) —
  o projeto legado MCIA não foi alterado. Obs.: `flagify-engine-v1` foi pausado
  (decisão do usuário) para liberar o slot free.
- Migrações base: extensões (pgcrypto, pgvector) + schema `private`; tenancy
  (`accounts`, `memberships`, `platform_admins`, `app_config`) com RLS e grants
  explícitos; helpers RLS `security definer` + policies canônicas; trigger de
  signup (account + membership owner automáticos).
- Auth completa: email/senha, magic link (`/auth/confirm`) e Google OAuth
  (`/auth/callback`), sessão renovada via `src/proxy.ts` (@supabase/ssr),
  rotas protegidas por route group, dashboard placeholder.
- i18n-ready: strings em `messages/pt-BR.json` via next-intl (locale fixo pt-BR).
- Testes de RLS (Vitest, 10 cenários) provando isolamento entre accounts,
  trigger de signup e invisibilidade das tabelas de plataforma.
- CI GitHub Actions: lint + typecheck + build + testes de RLS contra
  `supabase start` + guard-rail anti-vazamento da service key.
- `docs/ARCHITECTURE.md` com topologia, template de tenancy/RLS e ADR do motor
  de jobs (Vercel Cron + Fluid Compute, pipeline stage-checkpointado).

### Decisões
- Projeto Supabase remoto criado já na Fase 0 (custo US$ 0/mês, org MCIA).
- Motor de jobs: Vercel Cron + Fluid Compute; engine trocável ("o engine agenda
  e executa estágios; nunca é dono do estado").
- pnpm puro (sem Turborepo) até haver mais de um app com build pesado.
- Tipos do banco gerados do stack local (`types.gen.ts`), regenerados a cada migração.

### Fora de escopo (por quê)
- Deploy Vercel: requer conexão do repo/projeto na conta Vercel do usuário;
  passos documentados em `docs/ARCHITECTURE.md` §5 — build local verde como evidência.
- Google OAuth em produção: exige criar credenciais no Google Cloud Console e
  registrar redirect URLs no dashboard do projeto novo (manual do usuário).
- Todo o domínio de produto (fontes, curadoria, entrega, billing): Fases 1-6.

### Como testar
```bash
pnpm install
pnpm exec supabase start -x studio,imgproxy,edge-runtime
pnpm -r lint && pnpm -r typecheck && pnpm --filter web build
pnpm vitest run --config supabase/tests/vitest.config.ts   # 10 testes de RLS
pnpm --filter web dev                                       # signup → dashboard
```
