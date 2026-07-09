# CHANGELOG

## UX pass 2 — fluxos mais intuitivos (2026-07-09)

- **Wizard de adição de fonte** (decisão do Marcus): o modal abre listando a
  biblioteca de fontes predefinidas + botão "fonte completamente nova". Fonte
  nova = 3 passos (tipo site/Instagram → link → validação); fonte da biblioteca
  pula direto para a validação. A validação faz a **1ª coleta AO VIVO das
  últimas 48h** e um judge barato (haiku) marca **quais itens têm a ver com os
  temas do briefing** ("✦ seu tema") antes do usuário confirmar a inclusão —
  nada é persistido sem o ok.
- **Preview rico**: cards clicáveis com título, resumo, data e mídia (thumb do
  post no Instagram via `image` no `FetchedItem`), na lista de fontes e no
  wizard; revalidação também guarda o preview rico.
- **Instagram aceita qualquer forma**: link do perfil, @usuario ou usuario
  (`parseInstagramHandle`).
- **Temas fechados**: taxonomia de 7 categorias × ~35 subcategorias
  (`lib/themes.ts`) com seletor por chips — categoria inteira num clique
  (ex.: todo o Jurídico) ou refinado (só Direito Tributário).
- **Loadings em toda ação**: `SubmitButton` (useFormStatus + spinner) nos forms
  de fontes/admin/settings; spinners nos fluxos de verificação de WhatsApp;
  campos controlados nos forms do wizard (React 19 reseta uncontrolled após
  server action — bug real pego no smoke).
- **Buscar removido da nav/home** (por enquanto; a rota `/search` continua
  funcional para reativar depois).


## Redesign UI/UX — high-end visual pass (2026-07-09)

**Todos os fluxos revistos com a linguagem "Ethereal Glass" (skill de design
do usuário): preto OLED com mesh gradients, cartões double-bezel, tipografia
display e motion com física.**

- **Fundação**: fontes Geist (corpo) + Space Grotesk (display/big numbers) —
  zero fontes banidas; tokens escuros únicos; mesh gradient e film grain em
  camadas fixas (pointer-events-none); ease padrão `cubic-bezier(0.32,0.72,0,1)`.
- **Primitivas**: Card virou **double-bezel** (casca + núcleo de vidro com
  highlight interno); botões pill com active:scale e sombra de vidro; inputs
  translúcidos; badges hairline; `ArrowBubble` (button-in-button com desliza
  diagonal no hover).
- **Nav "Fluid Island"**: pill de vidro flutuante descolada do topo (único
  backdrop-blur, em elemento fixo), estado ativo por rota; mobile com hamburger
  que morfa em X e overlay com reveal escalonado.
- **Home nova** (/dashboard): hero com eyebrow + saudação display, **bento
  assimétrico de big numbers** (must-reads, atualizações, suprimidos, fontes
  ok, arquivo) e **4 shortcuts** com hover kinetics; briefing do dia abaixo;
  alerta de fontes com problema.
- **Auth**: editorial split (manifesto à esquerda, formulário de vidro à
  direita). Demais páginas herdaram tipografia display, entradas `rise` com
  blur-up e selects/labels no mesmo idioma visual.
- Acessibilidade/perf: `prefers-reduced-motion` desliga entradas; animações só
  com transform/opacity; blur restrito a fixed/sticky; mobile 100% single-column.


## Fase 5 — Instagram connector (2026-07-09)

**Handle do IG vira fonte normalizada; kill-switch global funciona (aceite do
brief) — connector isolado atrás de interface, provedor trocável num arquivo.**

### Adicionado
- **`InstagramConnector` real** (`packages/ingestion/src/connectors/instagram.ts`):
  posts do perfil viram `FetchedItem` — 1ª linha da legenda é o título, legenda
  completa é o conteúdo (com `[transcrição do vídeo]` anexada quando o provedor
  fornecer — extension point), permalink é a URL. **Janela capada em 24h**
  (decisão do Marcus: post de rede envelhece rápido; a janela do profile só
  encolhe isso). Tier fixo 3 — rede social é sinal, nunca fonte canônica.
- **Provedor Apify** (`providers/apify.ts`): actor `apify/instagram-scraper`
  via run-sync, atrás da interface `InstagramFetcher` — trocar de provedor =
  escrever outra classe. Env `APIFY_TOKEN`; ausente → erro claro na
  validação/coleta, sem quebrar o pipeline.
- **Kill-switch global**: `app_config.instagram_connector_enabled`, togglável
  no backoffice `/admin` — desliga a coleta de IG para TODAS as contas na hora,
  sem deploy. Checado no pipeline antes de chamar o provedor.
- **Feature por plano**: `plans.features.instagram` (hoje: pro). Conta sem
  plano com social → fonte bloqueada com mensagem clara no health/report, e a
  adição em `/sources` também recusa.
- **UI**: card "Perfil do Instagram" em `/sources` (handle com validação na
  hora) + card do kill-switch em `/admin`.
- **Testes**: 6 unit no connector (normalização, cap de 24h, transcrição,
  sem legenda, sem provedor, erro do provedor) + **3 de aceite** com o estágio
  collect real: kill-switch desligado → bloqueado e provedor NUNCA chamado;
  sem plano → bloqueado; com pro → item normalizado no checkpoint (suíte 40).

### Fora de escopo (documentado)
- Transcrição de vídeo: o Apify não transcreve; o shape (`transcript`) já
  aceita — quando quisermos, um segundo provedor (ex.: Whisper sobre o vídeo)
  preenche o campo sem tocar no resto.
- E2E com Apify real aguarda `APIFY_TOKEN` (pedir ao usuário).

## Fase 4 — Dashboard completo + backoffice mínimo (2026-07-08)

**Navegação completa read/write com RLS (aceite do brief) + o backoffice de
concessão de assinaturas antecipado da Fase 6.**

### Adicionado
- **Histórico** (`/briefings`): arquivo paginado de briefings com contadores;
  detalhe (`/briefings/[id]`) reusa o render do dashboard via componente
  compartilhado `BriefingView` (RLS: briefing de outra conta → 404).
- **Busca** (`/search`): **full-text** nos clusters (coluna `tsvector`
  'portuguese' gerada + GIN, consulta via `textSearch` com a RLS normal) e
  **semântica** (embedding da query via Voyage → `match_topic_memory` com o
  profile do próprio tenant; sem key/erro do provedor degrada para só-FTS).
- **Timeline de assunto** (`/topics/[id]`): todas as aparições de um tópico da
  memória com "o que mudou" de cada Atualização e links pros briefings; entrada
  pelo título do cluster no dashboard/detalhe e pela busca.
- **Dashboard**: alerta de fontes com problema no último briefing (status de
  fontes na navegação diária) + link pro histórico.
- **Backoffice** (`/admin`, gate 100% server-side via `platform_admins` +
  service role — quem não é admin recebe redirect): contas com owner/assinatura,
  **conceder/revogar plano** (`source: admin_grant`, audit de quem concedeu),
  e catálogo global de fontes sugeridas (`/admin/catalog`: adicionar, pausar,
  remover). Link "Admin" na nav só aparece para admins.
- **Schema**: `plans` (free/pro seed) + `subscriptions` (única vigente por
  account via unique parcial; colunas `stripe_*` prontas para a Fase 6);
  `clusters.fts`; `isPlatformAdmin` helper em `packages/db`.
- **Testes**: +4 RLS (planos legíveis/imutáveis; assinatura visível só ao dono
  e não gravável pelo cliente; FTS não vaza clusters entre contas; timeline
  isolada) — suíte total 37. Smoke Playwright dos 7 fluxos (dashboard →
  histórico → detalhe → timeline → busca → conceder pro → catálogo).

### Decisões
- Backoffice usa service role **depois** de `requirePlatformAdmin` (padrão da
  Fase 0: `platform_admins` sem policies, bypass impossível via PostgREST).
- Busca semântica reusa a RPC do pipeline (`match_topic_memory`, execute
  revogado de authenticated) — o gate é o `requireTenant` + profile_id próprio,
  sem RPC nova exposta.

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
- **Só WhatsApp por enquanto (Marcus, 2026-07-08)**: o canal email nasce
  desligado (migração `20260708210001`). O código de email está pronto e
  testado E2E, mas sem domínio próprio verificado no Resend o envio só chega ao
  email da conta Resend. **Para ativar**: verificar o domínio em
  resend.com/domains (3 registros DNS), trocar `EMAIL_FROM` para um endereço do
  domínio e reverter o default de `channels`.

### Validado E2E em produção (2026-07-08)
- Double opt-in real: destino adicionado na UI → código de 6 dígitos chegou no
  WhatsApp do Marcus via Z-API → confirmado → verificado.
- Briefing entregue: 2 mensagens (1143 e 1403 chars) no número verificado;
  grupo **não verificado recusado** (`skipped_unverified`); email entregue via
  Resend (id `af542443…`) antes da decisão de desligar o canal; reexecução do
  estágio **não reenviou** o WhatsApp já enviado (idempotência em produção).

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
