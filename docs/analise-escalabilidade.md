# Análise de escalabilidade — 50+ briefings simultâneos

> Data: 2026-07-12 · Baseado no código em `apps/web/src/lib/worker.ts`, `packages/curation/*` e nos dados reais da tabela `jobs` (projeto Supabase `briefing-saas`).

## 1. Diagnóstico do incidente de hoje ("briefing sendo gerado" às 9h)

Evidência direta na tabela `jobs` (2026-07-12):

- O Vercel Cron dispara `/api/cron/tick` **1× por dia** (`0 10 * * *`, plano Hobby).
- Às 10:37 UTC (7:37 BRT) o tick de hoje enfileirou **5 jobs** (as contas de teste duplicadas).
- O orçamento de 240s do tick foi consumido **terminando 2 jobs requeued de ontem** (`cron-55862339` pegou os jobs de 11/07 que haviam falhado).
- Os 5 jobs de hoje ficaram `queued / collect` — e **não existe segundo tick no dia**. O dashboard mostra o spinner "sendo gerado" para sempre, até alguém clicar "Gerar agora" (que processa a fila inline) ou até o tick de amanhã.

Causa agravante: os jobs de 10–11/07 falharam com `credit balance is too low` na API Anthropic (crédito esgotado) — 3 tentativas, backoff de 5 min, e depois ficaram presos esperando o próximo tick diário.

**Resumo: o motor está correto (fila com claim atômico, checkpoint por estágio, idempotência), mas o "coração" bate uma vez por dia e processa um job por vez.**

## 2. O sistema aguenta 50 briefings simultâneos hoje? Não.

Números medidos (jobs `done`):

| Métrica | Valor |
|---|---|
| Tokens por briefing (in / out) | ~12,5k / ~12,3k (média) · até 31k/31k |
| Custo por briefing (Sonnet 5 + Haiku 4.5) | **US$ 0,22 médio · US$ 0,54 máximo** |
| Tempo de pipeline (retomada, estágios finais) | ~2 min; pipeline completo estimado 3–6 min |

Gargalos em ordem de impacto:

1. **Frequência do trigger** — 1 tick/dia × 240s ≈ 1–2 jobs processados automaticamente por dia. Para 50 jobs precisa de tick a cada 1–5 min (Vercel Pro) ou scheduler externo gratuito (pg_cron + pg_net chamando o endpoint com `CRON_SECRET`, ou Cloudflare Worker cron).
2. **Processamento serial** — `processQueue` faz claim de 1 job por vez, em loop. 50 jobs × ~4 min = ~3h20 em série. O claim `FOR UPDATE SKIP LOCKED` já suporta concorrência — basta rodar N `runJob` em paralelo (`Promise.all`) e/ou aceitar múltiplas invocações simultâneas do tick. Fluid Compute favorece isso: o tempo é quase todo I/O-wait da API Claude.
3. **Coleta sequencial** — `collect()` busca fonte por fonte, com 2 writes no banco por fonte. Com 10–30 fontes isso pode levar 1–2 min sozinho. `Promise.allSettled` + batch dos health events resolve.
4. **Retry de rate-limit bloqueante** — `ClaudeLlmProvider` dorme 65s dentro do orçamento do tick quando toma 429. Com 50 jobs concorrentes em tier baixo da Anthropic, isso vira o gargalo. Precisa: verificar tier da org, jitter/fila de requisições, e devolver o job à fila em vez de dormir.
5. **Trabalho duplicado entre usuários** — cada profile coleta e clusteriza as próprias fontes. 50 usuários com catálogo parecido = 50× o mesmo fetch de RSS e 50× clusterização de itens quase idênticos. Camada de ingestão compartilhada (tabela `items` por feed único, coletada 1×/dia) corta latência e custo de forma estrutural.
6. **Races menores sob concorrência** — `appendStageLog`/`incrementUsage` fazem read-modify-write sem lock (perde entradas com workers paralelos; trocar por RPC `jsonb_concat`/increment atômico). O `run-now` processa a fila inteira inline na request do usuário.
7. **UX de falha** — job `failed`/`queued` antigo aparece como spinner eterno. Precisa de estado visível ("atrasado", "falhou — tentaremos de novo") e alerta operacional.

## 3. Precisamos de um microsserviço Python? **Não.**

- O problema é **agendamento + concorrência**, não linguagem/performance. O pipeline é ~99% I/O-wait (RSS + API Claude); Node lida com isso nativamente.
- Todo o motor já existe como packages TS (`@briefing/curation`, `ingestion`, `delivery`) com testes. Um serviço Python reimplementaria prompts, heat score, memória semântica e entrega — dobro de manutenção, zero ganho.
- Caminho recomendado (incremental):
  - **Fase A (resolve 50 usuários, ~1 dia de trabalho):** tick a cada 1–5 min + processamento paralelo (N=5–10 jobs por invocação) + coleta paralela + correções dos itens 4/6/7. Tudo dentro do Vercel atual.
  - **Fase B (se passar de ~200–500 usuários ou precisar de SLA apertado):** extrair um worker Node de longa duração (Railway/Fly/Render, ~US$ 5–10/mês) que faz poll da MESMA tabela `jobs`, reutilizando os packages existentes. O design "o estado vive em jobs, o engine é substituível" foi feito exatamente para isso.
  - Ingestão compartilhada entra na Fase A ou B conforme a resposta da pergunta 5 abaixo.

## 4. Estudo de modelo para curadoria/análise de notícias

Importante: a **busca** de notícias hoje é RSS/scraping (determinística, custo ~zero) — o LLM faz **clusterização, notas dimensionais e geração de posts**. A comparação abaixo é para esse papel. (Se um dia quisermos busca nativa por LLM: Grok tem Live Search em US$ 25/1k fontes e Gemini tem grounding no Google Search — muda a arquitetura e o custo.)

### Custo — perfil real medido: ~15k tokens in + ~15k tokens out por briefing

| Modelo | US$/1M in | US$/1M out | Custo/briefing | **Custo/dia (50 briefings)** | Custo/mês (50) |
|---|---|---|---|---|---|
| **Claude Sonnet 5 (atual)** | 3,00 (2,00 intro até 31/08) | 15,00 (10,00 intro) | **0,27 (medido: 0,22)** | **~11–13,50** | ~330–405 |
| Claude Haiku 4.5 | 1,00 | 5,00 | 0,09 | 4,50 | 135 |
| GPT-5.2 | 1,75 | 14,00 | 0,24 | 11,90 | 357 |
| GPT-5.1 | 1,25 | 10,00 | 0,17 | 8,45 | 254 |
| Gemini 3.1 Pro | 2,00 | 12,00 | 0,21 | 10,50 | 315 |
| Gemini 3 Flash | 0,50 | 3,00 | 0,05 | 2,65 | 79 |
| Grok 4.1 Fast | 0,20 | 0,50 | 0,01 | 0,55 | 16 |

Ressalvas: (a) tokens de *thinking* contam como output e variam por modelo — a coluna custo/briefing assume o mesmo perfil de tokens, o que na prática não se mantém; (b) prompt caching (já implementado no provider) reduz o custo real de input; (c) preços de concorrentes vieram de agregadores em jul/2026 — confirmar nas páginas oficiais antes de precificar.

### Qualidade para ESTA tarefa (clusterização + notas + posts PT-BR com voz própria)

- **Claude Sonnet 5** — melhor combinação de instruction-following, structured outputs nativos (JSON schema validado na API) e escrita PT-BR com voz consistente. Já integrado, já medido. Risco: custo/briefing mais alto da tabela.
- **GPT-5.x** — qualidade comparável; migração exigiria revalidar prompts e structured outputs. Sem vantagem clara que justifique a troca.
- **Gemini 3 Flash / 3.1 Pro** — Flash é o melhor custo-benefício "honesto" para sumarização/clusterização em volume; Pro compete com Sonnet. Contexto 1M ajuda se o volume de itens crescer. Escrita PT-BR com voz específica tende a exigir mais iteração de prompt.
- **Grok 4.1 Fast** — disruptivo em preço e com Live Search nativo do X (interessante para "heat" em tempo real), mas: universo fechado de fontes é princípio do produto, e consistência de structured output/voz é menos comprovada. Vale um experimento, não uma migração.

### Recomendação

Manter **Sonnet 5 (heavy) + Haiku 4.5 (cheap)** agora — o custo de ~US$ 0,22/briefing é problema de margem, não de viabilidade — e atacar custo por outra via, com efeito maior que trocar de modelo:

1. **Ingestão + clusterização base compartilhadas** entre usuários com fontes em comum → corta o custo heavy de ~N× para ~1× + seleção barata por usuário.
2. Rebaixar a **clusterização** para Haiku 4.5 ou Gemini 3 Flash (A/B contra o baseline Sonnet), mantendo Sonnet só nos **posts** (onde a voz importa). Estimativa: briefing cai para ~US$ 0,08–0,12.
3. A abstração `LlmProvider` já permite plugar outro provedor por estágio — a decisão pode ser tomada por dados (A/B), não por fé.

Com (1)+(2), 50 usuários custam ~US$ 2–4/dia de LLM (~US$ 60–120/mês), o que viabiliza preço de assinatura na faixa R$ 29–49/mês com margem confortável.
