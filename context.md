# Context — for agents working on this repo

> Onboarding doc para qualquer agente (humano ou Claude) que precise entender ou modificar este projeto. Leia antes de propor mudanças.

---

## 1. O que este repo é

Skill + prompt que rodam dentro de uma **Claude Code Remote Routine** agendada para 7h America/São Paulo (10h UTC), todo dia.

A routine clona este repo, lê `PROMPT.md`, e executa o fluxo de curadoria diária: varre 30 portais de tecnologia, agrupa em clusters por convergência de cobertura, pontua, gera até 3 sugestões de post, persiste no Supabase e envia 2 mensagens via WhatsApp.

**Não é uma biblioteca, não é uma CLI, não tem código executável fora do conteúdo dos arquivos.** Tudo é instrução em natural language interpretada por um agente Claude na execução.

## 2. Arquitetura

```
┌────────────────────────────────────────────┐
│ Claude Code Remote Routine                 │
│ trig_01Hu3YnGHhGr9Ly8WCvtvunV              │
│ cron: 0 10 * * * (UTC)                     │
│ model: claude-sonnet-4-6                   │
│ prompt: "Leia PROMPT.md e siga"            │
│                                            │
│  MCP connectors anexados:                  │
│    - Gmail (legado, não usado)             │
│    - zapi-mcp → send_whatsapp_text         │
│    - Supabase → execute_sql                │
└────────────────┬───────────────────────────┘
                 │ clona a cada execução
                 ▼
   github.com/marcuscavco/briefing-content-cron
   ├── PROMPT.md       (entry-point)
   ├── SKILL.md        (motor — 9 etapas)
   └── references/
       ├── fontes.md
       ├── pontuacao.md
       ├── posts.md
       └── voz.md
                 │ executa fluxo
                 ▼
   ┌─────────────────────────────────────────┐
   │ Saídas:                                 │
   │  - 2 msgs WhatsApp via send_whatsapp_text│
   │  - INSERTs em briefings/clusters/posts  │
   │    via execute_sql (Supabase MCP)       │
   └─────────────────────────────────────────┘
```

## 3. O que vive aonde

### No repo (editável via `git push` — qualquer commit na main vale na próxima execução)

| Arquivo | Função |
|---|---|
| `PROMPT.md` | Entry-point. Env vars (`WHATSAPP_DESTINO`, `SUPABASE_PROJECT_ID`), setup do workdir, chamada das etapas |
| `SKILL.md` | Motor de curadoria detalhado: 9 etapas, queries SQL, formato das mensagens WhatsApp, validações, casos de borda |
| `references/fontes.md` | Universo fechado: 5 portais Tier 1 (canônicos, leitura) + 25 Tier 2 (sinal). Prioridade de fallback |
| `references/pontuacao.md` | Heat Score (regras de pontuação por convergência) + notas dimensionais 💻 Técnica / 💼 Empresarial (0-3 cada) |
| `references/posts.md` | Decisão postar/skip, formatos (Reels/Carrossel/etc.), tipos de ângulo |
| `references/voz.md` | Tom da voz Marcus (peer-to-peer, sem hype, PT-BR direto) |

### Na config da routine (precisa UI ou API `RemoteTrigger`)

| Item | Valor atual |
|---|---|
| Cron | `0 10 * * *` (7h BRT) |
| Modelo | `claude-sonnet-4-6` |
| Repo source | `https://github.com/marcuscavco/briefing-content-cron` |
| Environment | `env_01Nr7kmdhe7i9Co8nDZTiNCL` (anthropic_cloud) |
| `allowed_tools` | Bash, Read, Write, Edit, Glob, Grep, `fetch_rss`, `fetch_the_information`, `send_whatsapp_text`, `execute_sql` |
| MCP connectors | rss-mcp, zapi-mcp, Supabase, Gmail (legado) |
| Prompt da routine | One-liner: "Leia `PROMPT.md` na raiz do repositório clonado e siga exatamente as instruções lá." |

UI da routine: https://claude.ai/code/routines/trig_01Hu3YnGHhGr9Ly8WCvtvunV

### Externo ao repo e à routine

- **WhatsApp destino:** `5585997993333` (hardcoded em `PROMPT.md`)
- **Z-API**: tokens vivem no MCP server `zapi-mcp` (Cloudflare Worker em `noisy-thunder-5892.marcusccoelho.workers.dev`, OAuth via `mcp.supabase.com/mcp` style). Não há credencial Z-API no repo.
- **Supabase project:** `ckjvbzynskuqmdanmxgs` (nome: MCIA, region: us-east-2)

### Cloudflare Workers (RSS infrastructure)

| Worker | URL | Visível para a routine? | Função |
|---|---|---|---|
| `rss-mcp` | `https://rss-mcp.marcusccoelho.workers.dev/mcp` | ✅ Sim (MCP connector) | Servidor MCP. Expõe `fetch_rss(url)` e `fetch_the_information()`. |
| `rss-proxy` | `https://rss-proxy.marcusccoelho.workers.dev` | ❌ Interno | Chamado pelo `rss-mcp` para todos os feeds. Auth via `PROXY_TOKEN` (secret do Worker). |
| `theinformation-feed` | `https://theinformation-feed.marcusccoelho.workers.dev/theinformation-feed` | ❌ Interno | Chamado pelo `rss-mcp` para The Information. Basic Auth interna. |

A routine só interage com `rss-mcp` — nunca chama `rss-proxy` ou `theinformation-feed` diretamente.

## 4. Schema Supabase

Projeto `ckjvbzynskuqmdanmxgs`. Migrações via `apply_migration` ou `execute_sql`.

```
briefings (1 linha por execução)
├── id uuid PK
├── data date                       -- AAAA-MM-DD da execução (BRT)
├── executado_em timestamptz
├── n_clusters_total int            -- todos os clusters detectados
├── n_must_read / n_relevante / n_no_radar / n_sinal_sem_fonte int
├── n_noticias int                  -- soma das categorias que entram no digest
├── n_posts int                     -- posts publicáveis enviados
├── n_posts_skipped int
├── whatsapp_status text            -- 'sent' | 'failed'
├── whatsapp_msg text               -- Mensagem 1 (Digest)
├── whatsapp_status_2 text
├── whatsapp_msg_2 text             -- Mensagem 2 (Posts)
├── email_status text               -- DEPRECATED (era usado quando havia Gmail)
└── notas jsonb                     -- {"inacessiveis": [...], "tier1_inacessivel": [...]}

clusters (3-N linhas por briefing)
├── id uuid PK
├── briefing_id uuid FK CASCADE
├── ordem int                       -- ordem no digest (1=primeiro Must-read)
├── titulo text
├── fonte text                      -- portal canônico (Tier 1) ou fallback (Tier 2)
├── url text                        -- URL canônica, SEM parâmetros de proxy
├── data_publicacao date
├── resumo text                     -- TL;DR do cluster
├── categoria text                  -- 'must_read' | 'relevante' | 'no_radar' | 'sinal_sem_fonte'
├── heat_score int                  -- pontuação por convergência
├── relevancia_tecnica smallint     -- 0..3
├── relevancia_empresarial smallint -- 0..3
├── tier_fonte smallint             -- 1 | 2 (fallback) | NULL
├── is_fallback bool                -- true se cluster Must-read sem Tier 1 que recebeu fallback Tier 2
├── portais_cobrindo jsonb          -- ["The Information","Bloomberg",...]
├── nota numeric(3,1)               -- DEPRECATED (legado — use heat/relevancias)
└── por_que_importa text            -- DEPRECATED (legado)

posts (0-3 publicáveis + N skips)
├── id uuid PK
├── briefing_id uuid FK CASCADE
├── cluster_id uuid FK CASCADE      -- cluster que originou o post
├── ordem int
├── formato text                    -- 'Reels' | 'Carrossel' | 'Infográfico' | 'Post longo' | 'Vídeo longo'
├── justificativa_formato text
├── gancho text                     -- hook em até 15 palavras
├── estrutura jsonb                 -- [{"slide":1,"texto":"..."},...]
├── cta text
├── angulo_tipo text                -- 'traducao_empresario' | 'checklist' | 'take_contrario' | etc.
├── angulo_descricao text           -- descrição em 1 frase
├── skip bool                       -- true = post sugerido mas pulado (com motivo)
├── skip_motivo text
├── noticia_base_ordem int          -- DEPRECATED (use cluster_id)
├── hashtags text[]                 -- DEPRECATED (motor novo não usa)
├── nota_viralizacao numeric(3,1)   -- DEPRECATED
└── justificativa_nota text         -- DEPRECATED
```

Colunas marcadas DEPRECATED ficaram do schema v1; podem ser dropadas em uma migração futura sem breakage (motor novo não escreve nelas).

## 5. Como iterar (workflows comuns)

### Adicionar/remover portal do universo

Edite `references/fontes.md`. Push. Próxima execução usa.

### Ajustar pesos do Heat Score ou faixas de categoria

Edite `references/pontuacao.md`. Push.

### Mudar regra de decisão de post (filtro 💼, limite diário, etc.)

Edite `references/posts.md`. Push.

### Mudar formato das mensagens WhatsApp ou ordem das etapas

Edite `SKILL.md`. Push.

### Mudar destinatário, projeto Supabase, ou env vars

Edite `PROMPT.md`. Push.

### Mudar horário, modelo, ou anexar/remover connector

Use UI da routine (https://claude.ai/code/routines/trig_01Hu3YnGHhGr9Ly8WCvtvunV) ou peça pro Claude usar a tool `RemoteTrigger`.

### Schema do banco

Use `apply_migration` (DDL) ou `execute_sql` (DML/análises). Sempre via Supabase MCP. Nunca commite credenciais Supabase no repo — o `project_id` é a única referência usada e é público (ele é o subdomínio público da API).

### Feed RSS retornando erro

Todos os fetches passam pelo MCP `rss-mcp`. Se `fetch_rss(url)` retornar erro para um portal, ele é marcado como inacessível e o fluxo prossegue sem fallback. Para adicionar um novo feed, documente a URL do feed RSS em `references/fontes.md` — o `rss-mcp` cuida do resto.

### Mudar tools disponíveis pra routine

Adicione/remova nomes em `allowed_tools` da config da routine via API/UI. Tools MCP têm o formato `mcp__<connector_uuid>__<tool_name>`.

## 6. Restrições inegociáveis

1. **Nunca commite tokens/credenciais no repo.** Z-API tokens estão no Worker (mcp server). Supabase usa o connector OAuth-based. Email não é usado mais.
2. **Universo fechado de fontes.** Não adicione portais a `fontes.md` sem motivo claro. O agente NÃO deve buscar fora dessa lista.
3. **URLs entregues ao usuário são limpas** (sem parâmetros de proxy, sem `/rss/`, sem `/feed/`).
4. **Cada mensagem WhatsApp ≤ 1500 chars.** Validar com `wc -c` antes de enviar. Sem exceções.
5. **PT-BR sempre** na entrega final, independente da língua das fontes.
6. **Skip por padrão em posts.** Postar precisa ser justificado por ângulo + 💼 ≥ 2.
7. **Não inflar o digest.** Silêncio honesto se o universo não cobriu nada relevante no dia.

## 7. Decisões de design que vale conhecer

- **Por que repo + routine separados?** Repo é versionado e iterável via git. Routine config é a "infra" — cron, conectores, modelo. Mover o prompt pro repo (este `PROMPT.md`) tira 99% das mudanças do API/UI da routine.
- **Por que Cloudflare Worker pro Z-API?** O sandbox do CCR (Anthropic cloud) bloqueia hosts não allowlistados. `api.z-api.io` não passa direto. O Worker (`*.workers.dev` está allowlistado) atua como proxy + adiciona OAuth via MCP.
- **Por que `clusters` (e não `noticias`)?** Um cluster = um assunto. Vários portais cobrem o mesmo assunto = 1 cluster, N portais. O nome reflete o conceito do motor (convergência).
- **Por que duas mensagens WhatsApp?** Limite de 1500 chars por mensagem (definição do agente, não do WhatsApp). Mensagem 1 é leitura pessoal (digest com técnica + empresarial). Mensagem 2 é trabalho de posicionamento (filtra apenas Empresarial ≥ 2).
- **Por que Heat Score em vez de rubrica subjetiva?** Versões anteriores tinham uma rubrica de 5 critérios com pesos. Era subjetivo demais. Heat = quantos portais cobrem = sinal mais robusto.
- **Por que dimensional 💻 + 💼 separadas?** Antes tinha uma "nota geral 0-10". Mas um modelo novo de IA tem alta relevância técnica e baixa empresarial — comprimir as duas em uma nota era perda de informação.

## 8. Histórico e o que NÃO está mais aqui

Este repo já teve outra forma. Foi limpo. **NÃO** tente reintroduzir:

- `assets/` (templates HTML) — fluxo não gera mais HTML/PDF
- `scripts/` (Python helpers `html_to_pdf.py`, `send_zapi.py`) — substituído por MCP
- `references/criterios.md` (rubrica subjetiva v1) — substituído por `pontuacao.md`
- Envio de email — Gmail connector não tem `send`, só `create_draft`. Decisão: dropar email, focar em WhatsApp + Supabase
- Salvamento no Google Drive — removido por simplicidade. Reabilitar apenas se houver caso de uso novo.

## 9. Como testar mudanças

1. Faça o commit no repo (qualquer branch — main vai pra próxima execução agendada)
2. Pra testar imediatamente: clique **Run now** em https://claude.ai/code/routines/trig_01Hu3YnGHhGr9Ly8WCvtvunV
3. Acompanhe os logs em tempo real na mesma página
4. Verifique:
   - Mensagens chegaram no WhatsApp `5585997993333`
   - Linhas inseridas em `briefings`, `clusters`, `posts` no Supabase MCIA
   - Relatório final do agente bate com o que esperava

Se quebrar, leia o erro e ajuste o arquivo correspondente. Logs do Worker Z-API: `npx wrangler tail` ou dashboard CF.
