# Teste de RSS Feeds — One-time

Você é um agente de diagnóstico. Sua única missão é testar se os feeds RSS abaixo estão acessíveis e retornam conteúdo válido. Não salve nada no Supabase. Não envie WhatsApp. Apenas reporte.

## Como testar cada feed

Para cada feed da lista:

1. `WebFetch(url_do_feed)` — direto, sem Jina
2. Verifique se a resposta contém tags XML de feed válido (`<rss>`, `<feed>`, `<channel>`, `<item>` ou `<entry>`)
3. Se falhar (erro, HTML em vez de XML, ou resposta vazia): tente via Jina `WebFetch("https://r.jina.ai/" + url)`
4. Registre o resultado

## Feeds a testar

### Tier 1
| Portal | URL do feed |
|---|---|
| The Information | https://theinformation-feed.marcusccoelho.workers.dev |
| Exame | https://exame.com/feed/ |

### Tier 2 — Internacional
| Portal | URL do feed |
|---|---|
| Ars Technica | https://feeds.arstechnica.com/arstechnica/index |
| MIT Technology Review | https://www.technologyreview.com/feed/ |
| Wired | https://www.wired.com/feed/rss |
| Rest of World | https://restofworld.org/feed/ |
| Platformer | https://www.platformer.news/feed |
| Garbage Day | https://www.garbageday.email/feed |
| 404 Media | https://www.404media.co/rss/ |
| The Verge | https://www.theverge.com/rss/index.xml |
| Engadget | https://www.engadget.com/rss.xml |
| CNET | https://www.cnet.com/rss/news/ |
| TechCrunch | https://techcrunch.com/feed/ |

### Tier 2 — Brasil
| Portal | URL do feed |
|---|---|
| Folha Tec | https://feeds.folha.uol.com.br/tec/rss091.xml |
| Estadão Link | https://www.estadao.com.br/link/feed/ |
| InfoMoney | https://www.infomoney.com.br/feed/ |
| NeoFeed | https://neofeed.com.br/feed/ |
| The Shift | https://www.theshift.info/feed/ |
| Núcleo Jornalismo | https://nucleo.jor.br/feed/ |
| Mobile Time | https://www.mobiletime.com.br/feed/ |
| Convergência Digital | https://www.convergenciadigital.com.br/feed/ |
| Tecnoblog | https://tecnoblog.net/feed/ |

## Relatório esperado

Ao final, retorne uma tabela com:

| Portal | URL testada | Resultado | Método | Observação |
|---|---|---|---|---|
| Ars Technica | https://... | ✅ XML válido | Direto | N itens, último: DD/MM |
| Wired | https://... | ❌ HTML/403 | Jina | Retornou página de paywall |
| ... | | | | |

**Legenda:**
- ✅ XML válido — feed acessível e parseável
- ⚠️ Parcial — acessível mas sem itens recentes (mais de 48h)
- ❌ Falhou — erro, 403, ou HTML em vez de XML (mesmo com Jina)

Ao final da tabela, liste separadamente:
- **Feeds que precisam de Worker** (❌ mesmo com Jina)
- **Feeds que funcionam só com Jina** (❌ direto mas ✅ Jina)
- **Feeds que funcionam direto** (✅ sem Jina)
