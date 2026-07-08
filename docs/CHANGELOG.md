# CHANGELOG

## Fase 3 — Entrega: email + WhatsApp multi-tenant (2026-07-08)

**O briefing chega nos canais do usuário no horário dele, com destino WhatsApp
verificado por double opt-in e entrega idempotente.**

### Adicionado
- **`packages/delivery`**: render WhatsApp fiel aos templates da Etapa 8 do
  `SKILL.md` (Digest + Posts, marcações ✨🔁🟡⚠️💡, silêncio honesto) com **corte
  progressivo garantindo ≤ 1500 chars SEMPRE** (provado por teste); template de
  email React Email (digest completo + posts + link do dashboard + unsubscribe);
  `ZapiClient` (REST direto, phone LITERAL) e `ResendEmailSender` atrás das
  interfaces `WhatsappSender`/`EmailSender` (fakes em teste).
- **Estágio `deliver` real** (`packages/curation/src/deliver.ts`): email ao
  owner da account; WhatsApp para cada destino — **não verificado é recusado**
  (`skipped_unverified`), inativo pula, já-enviado não repete (unique parcial
  `sent` no `delivery_log`), falha em um destino não derruba os outros; msg1/msg2
  persistidas no briefing (auditoria); relatório em `briefings.notas.entrega`.
  Sem env do provedor, canal loga `skipped_disabled` (não quebra o pipeline).
- **Double opt-in** (`whatsapp_destinations`): código 6 dígitos via Z-API
  (grupo recebe no grupo — prova que o bot é membro), expira em 15min, máx
  3 envios/hora e 5 tentativas; **`verified` só muda via service role** —
  trigger `protect_whatsapp_verification` bloqueia auto-verificação e troca de
  phone pelo cliente (mudou o número? apaga e verifica de novo).
- **UI /settings**: seção "Entrega" com destinos (adicionar/verificar/pausar/
  remover), checkbox WhatsApp habilitado só com destino verificado;
  `GET /api/unsubscribe?token=` (HMAC-SHA256 com `CRON_SECRET`) desliga o email.
- **Testes**: 9 unit (render ≤1500/formatação/atualização), 7 RLS
  (isolamento + anti auto-verificação + formato `@g.us` rejeitado), 2 aceite
  (canais entregam; não verificado recusado; retry não duplica).

### Decisões
- **Z-API direto da Vercel** (sem o Worker `zapi-mcp`): o worker existia pela
  allowlist do sandbox da Remote Routine; a Vercel não tem essa restrição.
  A regra de match exato do phone foi portada e documentada na migração.
- Destinos WhatsApp por **briefing profile** (não por account) — preparado para
  múltiplos briefings por conta.

## Fase 2 — Motor de curadoria + memória/dedupe (2026-07-08)

**O coração do produto: as 9 etapas do `SKILL.md` viram pipeline de código
parametrizado por briefing profile, com a memória entre briefings que resolve
a dor nº 1 (repetição de notícias).**

### Adicionado
- **`packages/curation`**: pipeline stage-checkpointado (collect → cluster →
  memory → posts → persist → deliver → report). Clusterização + notas 💻/💼 numa
  chamada `claude-sonnet-5` (structured outputs + prompt caching das instruções
  fixas); Heat Score, categorização, seleção de fonte canônica/fallback e
  Curator's Pick determinísticos em código (pesos default = legado; Tier 3 vale
  0.5 e nunca vira link); posts com voz/formatos/ângulos do `posts.md`
  (skip por padrão, filtro 💼≥2, limite por profile enforced em código).
- **Memória semântica (`topic_memory`, pgvector 1024 dims via Voyage
  voyage-3.5-lite)**: antes de incluir um assunto, o motor busca o histórico do
  profile — já tratado sem novidade → **suprime**; com novidade material
  (judge `claude-haiku-4-5`) → reintroduz como **"Atualização"** com o que mudou
  e link ao briefing anterior; senão → novo. Dedupe exato por content-hash
  economiza judge. Janela de memória configurável (default 90 dias).
- **Fila `jobs`**: claim atômico `FOR UPDATE SKIP LOCKED`, retry com backoff,
  requeue de stale, idempotência 1 job/profile/dia, tokens+custo por job,
  stage_log. Worker: `/api/cron/tick` (Vercel Cron 15min, Fluid maxDuration
  800s, auth CRON_SECRET) com dispatch por delivery_time/timezone do profile;
  `/api/jobs/run-now` ("gerar agora" autenticado).
- **Dashboard**: briefing do dia com categorias, ✨Curator's Pick, 🔁Atualização
  ("o que mudou"), contagens de suprimidos/atualizações, posts sugeridos e skips.
- Schema: `briefings`/`clusters`/`posts` (evolução do legado sem colunas
  DEPRECATED), `fallback_eligible` (regra HN generalizada), RPCs
  `match_topic_memory`/`claim_next_job`/`requeue_stale_jobs` (execute só
  service_role).
- **Teste de aceite** (`supabase/tests/curation/`): pipeline real contra o stack
  local com LLM fake determinístico — dia 1 novo · dia 2 sem novidade suprimido ·
  dia 3 com novidade vira Atualização com o que mudou · timeline com 2 aparições.

### Decisões
- Embeddings: **Voyage AI** (decisão do usuário; interface `EmbeddingProvider`
  troca de provedor barato; dev sem key usa fallback hash determinístico).
- `job_runs` do brief §9 absorvido em `jobs` (stage_log + tokens/custo) —
  volume v1 não justifica duas tabelas.
- Etapa "select" fundida em "memory" (a seleção precisa das categorias
  pós-supressão); bônus HN 200+ pts fora do v1 (feed hnrss não expõe score).
- Correção de design achada pelo teste: hash de dedupe exato inclui o resumo —
  senão "Atualização" com título canônico igual era suprimida indevidamente.

### Aceite (verificado)
Dois dias seguidos não repetem assunto sem novidade (dia 2 suprimido); assunto
com novidade entra como "Atualização" com o que mudou (dia 3). 24 testes verdes.

### Fora de escopo (por quê)
- Execução com LLM real neste ambiente: sem ANTHROPIC_API_KEY aqui; primeira
  rodada real acontece na Vercel com as keys configuradas.
- Entrega email/WhatsApp: Fase 3 (estágio `deliver` é stub declarado).
- Pesos de Heat configuráveis por usuário/plano: Fase 6 (constantes já isoladas).

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
