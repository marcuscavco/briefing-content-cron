# Universo Fechado de Fontes

## Tier 1 — Portais com assinatura (fonte canônica de leitura)

**Única origem permitida** para extração de texto completo e recomendação de leitura. Ordem de preferência quando mais de um cobre o mesmo assunto:

**Método de coleta:** RSS privado de assinante (URL via variável de ambiente), via rss-proxy. Se rss-proxy retornar não-200, registre como inacessível e prossiga. Para artigos selecionados como canônicos, buscar conteúdo via rss-proxy para escrever TL;DR.

| Prioridade | Portal | URL base | RSS | Especialidade |
|---|---|---|---|---|
| 1 | The Information | https://www.theinformation.com | `https://theinformation-feed.marcusccoelho.workers.dev/theinformation-feed` (Worker dedicado, chamada direta) | Scoops de big tech, IA, VC |
| 2 | Stratechery | https://stratechery.com | `$STRATECHERY_RSS_URL` (assinante) | Análise estratégica de plataformas |
| 3 | The Economist | https://www.economist.com | `$THE_ECONOMIST_RSS_URL` (assinante, opcional) | Contexto macro/global |
| 4 | Valor Econômico (inclui Pipeline) | https://valor.globo.com | `https://pox.globo.com/rss/valor` | Mercado BR, M&A, regulação |
| 5 | Exame | https://exame.com | https://exame.com/feed/ | Negócios/tech BR ampliado |

## Tier 2 — Portais de sinal (apenas para pontuação)

Use **APENAS** para detectar e pontuar relevância. **Nunca extraia conteúdo completo, nunca recomende como leitura, nunca cite o artigo individualmente.** Eles existem só para responder: *"este assunto está sendo coberto?"*

**Método de coleta:** rss-proxy para todos os fetches. Se rss-proxy retornar não-200, registre como inacessível e prossiga.

### Internacionais

| Portal | URL base | RSS |
|---|---|---|
| Ars Technica | https://arstechnica.com | https://feeds.arstechnica.com/arstechnica/index |
| MIT Technology Review | https://www.technologyreview.com | https://www.technologyreview.com/feed/ |
| Wired | https://www.wired.com | https://www.wired.com/feed/rss |
| Bloomberg Technology | https://www.bloomberg.com/technology | *(sem RSS público — URL de feed a confirmar)* |
| Financial Times | https://www.ft.com/technology | *(sem RSS público — URL de feed a confirmar)* |
| Rest of World | https://restofworld.org | https://restofworld.org/feed/ |
| Platformer | https://www.platformer.news | https://www.platformer.news/feed |
| Garbage Day | https://www.garbageday.email | https://www.garbageday.email/feed |
| 404 Media | https://www.404media.co | https://www.404media.co/rss/ |
| The Verge | https://www.theverge.com | https://www.theverge.com/rss/index.xml |
| Engadget | https://www.engadget.com | https://www.engadget.com/rss.xml |
| CNET | https://www.cnet.com | https://www.cnet.com/rss/news/ |
| TechCrunch | https://techcrunch.com | https://techcrunch.com/feed/ |
| Hacker News | https://news.ycombinator.com | API direta: `https://hacker-news.firebaseio.com/` |

### Brasil

| Portal | URL base | RSS |
|---|---|---|
| Folha de S.Paulo (Tec) | https://www1.folha.uol.com.br/tec/ | https://feeds.folha.uol.com.br/tec/rss091.xml |
| Estadão Link | https://www.estadao.com.br/link/ | https://www.estadao.com.br/link/feed/ |
| InfoMoney | https://www.infomoney.com.br | https://www.infomoney.com.br/feed/ |
| Brazil Journal | https://braziljournal.com | *(sem RSS público confirmado — URL de feed a confirmar)* |
| NeoFeed | https://neofeed.com.br | https://neofeed.com.br/feed/ |
| The News (Waffle) | https://thenews.waffle.com.br | *(newsletter, sem RSS público — URL de feed a confirmar)* |
| The Shift | https://www.theshift.info | https://www.theshift.info/feed/ |
| Núcleo Jornalismo | https://nucleo.jor.br | https://nucleo.jor.br/feed/ |
| Mobile Time | https://www.mobiletime.com.br | https://www.mobiletime.com.br/feed/ |
| Convergência Digital | https://www.convergenciadigital.com.br | https://www.convergenciadigital.com.br/feed/ |
| Tecnoblog | https://tecnoblog.net | https://tecnoblog.net/feed/ |

## Prioridade de Fallback Tier 2 (apenas em Must-read sem Tier 1)

Quando precisar oferecer um Tier 2 como fallback, escolha pela ordem:

1. **Brasileiros editoriais:** Brazil Journal → NeoFeed → Folha (Tec) → Estadão Link → Núcleo Jornalismo → Tecnoblog
2. **Internacionais editoriais sem paywall:** Ars Technica → 404 Media → Wired → MIT Technology Review → Platformer → Rest of World
3. **Restantes:** The Verge → TechCrunch → Engadget → CNET → Mobile Time → Convergência Digital → InfoMoney → Garbage Day

**Excluídos como fallback** (continuam contando para heat, mas nunca aparecem como link de leitura):
- **Hacker News** — agregador, não publicação original
- **Bloomberg / Financial Times** — paywall externo sem assinatura ativa
- **The News (Waffle)** — newsletter de curadoria, não fonte primária

**Critério de desempate dentro do mesmo nível:** prefira a publicação que combina melhor com o eixo do assunto (BR + business → Brazil Journal/NeoFeed; tech profundo → Ars Technica/404 Media; cultura/sociedade tech → Wired/Rest of World).

## Notas operacionais

- **Pipeline (Valor)** → subconjunto de Valor Econômico (uma única fonte Tier 1, não duas)
- **Hacker News** → conta como 1 fonte Tier 2 independente da quantidade de comentários. Bônus 200+ pontos é separado e único
- **Paywall Tier 1 inacessível mesmo com assinatura** → indique falha no digest mas mantenha como canônico; não promova Tier 2
- **Cobertura exclusiva Tier 1 sem ressonância em Tier 2** → tag `🔍 Furo: exclusivo em <portal>`
