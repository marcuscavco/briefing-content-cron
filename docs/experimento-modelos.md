# Experimento de modelos — clusterização (Fase B)

> **DECISÃO (2026-07-12):** no julgamento cego, Marcus escolheu o **Gemini 3 Flash**
> (dia marketing). Ativado em produção via `LLM_CLUSTER=google:gemini-3-flash-preview`,
> junto com o scoring novo 🎯 relevancia_tema / ⚡ impacto_geral (Fase C). Posts
> permanecem no Sonnet 5. COGS projetado: ~R$ 7,80/usuário/mês (meta ≤ R$ 12 ✅).
> Ponto de atenção monitorado: compressão em dias densos (cobertura 57–76% no bench);
> rollback = trocar a env de volta, sem deploy.

> Gerado em 2026-07-12 a partir de 4 dias reais de coleta (bench/fixtures, extraídos de jobs.checkpoint de produção), mesmo prompt/schema de produção (CLUSTER_SYSTEM/CLUSTER_SCHEMA). Câmbio usado: R$ 5.50/US$.

## Medições por dia × modelo

| Fixture | Modelo | Custo (US$) | Latência | Tokens in/out | Clusters | Categorias | Cobertura vs baseline |
|---|---|---|---|---|---|---|---|
| marketing-2026-07-12 | Claude Haiku 4.5 | 0.0251 | 34s | 6645/3694 | 25 | no_radar: 8 · descartado: 17 | 80% |
| marketing-2026-07-12 | Claude Sonnet 5 (baseline/produção) | 0.1809 | 90s | 8591/10256 | 16 | no_radar: 5 · descartado: 11 | 100% |
| marketing-2026-07-12 | Gemini 3 Flash | 0.0169 | 23s | 5194/4777 | 11 | relevante: 1 · no_radar: 6 · descartado: 4 | 100% |
| negocios-2026-07-11 | Claude Haiku 4.5 | 0.0212 | 24s | 7188/2811 | 18 | relevante: 1 · no_radar: 2 · descartado: 15 | 100% |
| negocios-2026-07-11 | Claude Sonnet 5 (baseline/produção) | 0.1380 | 69s | 9241/7654 | 18 | relevante: 1 · no_radar: 2 · descartado: 15 | 100% |
| negocios-2026-07-11 | Gemini 3 Flash | 0.0144 | 16s | 5723/3857 | 6 | relevante: 2 · no_radar: 4 | 100% |
| tech-2026-07-10 | Claude Haiku 4.5 | 0.0549 | 55s | 19885/7008 | 43 | relevante: 5 · no_radar: 15 · descartado: 23 | 79% |
| tech-2026-07-10 | Claude Sonnet 5 (baseline/produção) | 0.3009 | 130s | 26212/15122 | 39 | relevante: 7 · no_radar: 9 · descartado: 23 | 100% |
| tech-2026-07-10 | Gemini 3 Flash | 0.0241 | 27s | 16659/5263 | 10 | relevante: 5 · no_radar: 3 · descartado: 2 | 76% |
| tech-2026-07-12 | Claude Haiku 4.5 | 0.0458 | 47s | 17479/5672 | 43 | relevante: 3 · no_radar: 12 · descartado: 28 | 95% |
| tech-2026-07-12 | Claude Sonnet 5 (baseline/produção) | 0.3479 | 160s | 23010/18892 | 38 | relevante: 4 · no_radar: 9 · descartado: 25 | 100% |
| tech-2026-07-12 | Gemini 3 Flash | 0.0193 | 23s | 14542/3998 | 10 | relevante: 3 · no_radar: 2 · descartado: 5 | 57% |

## Médias por modelo (clusterização)

| Modelo | Custo médio/briefing (US$) | Latência média | Cobertura média vs baseline |
|---|---|---|---|
| Claude Haiku 4.5 | 0.0368 | 40s | 89% |
| Claude Sonnet 5 (baseline/produção) | 0.2419 | 112s | 100% |
| Gemini 3 Flash | 0.0187 | 22s | 83% |

## Projeção de COGS por usuário (briefing diário)

Custo do cluster = medido neste experimento; posts/memória = medições de produção (stage_log).

| Cenário | US$/dia | R$/mês | Meta ≤ R$ 12 |
|---|---|---|---|
| Sonnet cluster + Sonnet posts (atual) | 0.271 | 44.65 | ❌ |
| Haiku cluster + Sonnet posts | 0.065 | 10.80 | ✅ |
| Gemini Flash cluster + Sonnet posts | 0.047 | 7.82 | ✅ |
| Haiku cluster + Haiku posts | 0.047 | 7.77 | ✅ |
| Gemini Flash cluster + Haiku posts | 0.029 | 4.78 | ✅ |

## Protótipo "Radar aberto" — grounding no Google Search (Gemini)

Probe com os temas reais do perfil tech (gemini-3-flash-preview):

- Latência: 35.3s · custo de tokens: US$ 0.01819 por chamada (grounding tem cobrança adicional por request — confirmar tabela vigente)
- Fontes citadas: 7 · **confiáveis (allowlist): 1 (14%)**
- Domínios retornados: itsection.com.br, canaltech.com.br, vietnam.vn, portalterradaluz.com.br, mercadoeconsumo.com.br, business-it.pt, jornaleconomico.sapo.pt

Aprendizados do probe:

1. **O conteúdo veio atual e real** (as manchetes batem com o que o universo fechado coletou no mesmo dia) — mas só depois de ancorar a data de hoje no prompt; sem isso o modelo buscou notícias da época do treino.
2. **Sem gate de grounding, o modelo às vezes responde de memória** (0 buscas) com notícias plausíveis porém não verificáveis — em produção isso seria notícia inventada. O gate `groundingMetadata presente, senão retry` é obrigatório.
3. **A maioria das fontes retornadas é de portais pequenos/duvidosos** (a dor relatada) — o filtro por allowlist derruba a maior parte das citações. Estratégia recomendada: usar o grounding apenas para **descobrir assuntos** (sinais), e confirmar/citar somente via fontes do universo confiável; nunca linkar domínio fora da allowlist.

Grok Live Search (xAI): não testado na prática — a conta ainda não tem créditos (console.x.ai). Custo de tabela: US$ 25/1.000 fontes retornadas + tokens (grok-4.1-fast US$ 0,20/0,50 por 1M). O script `probe-grounded-search.ts` está pronto para ganhar um `--provider grok` se os créditos forem adicionados.

## Como decidir

A decisão de qualidade é editorial e está em `docs/experimento-cego.md` (modelos anonimizados e embaralhados por dia). Critério combinado: se um modelo barato mantiver ≥90% da qualidade percebida vs o baseline, a clusterização migra (`LLM_CLUSTER` na Vercel — sem deploy). Posts permanecem no Sonnet 5 até um experimento próprio.

O gabarito está em `bench/results/gabarito.json` (fora do repo). Não abra antes de julgar.
