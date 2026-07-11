-- Fase 1: biblioteca curada de fontes sugeridas (catálogo global da plataforma).
-- Leitura para qualquer usuário autenticado; escrita só pela plataforma
-- (service role — gestão via backoffice na Fase 4).

create table public.suggested_sources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  type                public.source_type not null default 'rss',
  url                 text not null,
  feed_url            text,
  suggested_tier      smallint not null check (suggested_tier between 1 and 3),
  category            text not null,              -- 'tecnologia' | 'negocios' | 'economia' | 'geral'
  country             text not null default 'BR', -- 'BR' | 'INTL'
  language            text not null default 'pt-BR',
  is_free             boolean not null default true,
  requires_credential boolean not null default false,
  active              boolean not null default true,
  sort_order          int not null default 100,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index suggested_sources_url_uniq on public.suggested_sources (lower(coalesce(feed_url, url)));

alter table public.suggested_sources enable row level security;

grant select on public.suggested_sources to authenticated;
grant all on public.suggested_sources to service_role;

create policy suggested_sources_select on public.suggested_sources
  for select to authenticated
  using (active);

-- ── Seed ────────────────────────────────────────────────────────────────────
-- Critério (decisão de produto): portais BR nacionais, relevantes, confiáveis e
-- gratuitos primeiro; depois o universo atual de references/fontes.md (que segue
-- válido para o seed do account do Marcus na Fase 7). Tier sugerido segue a
-- lógica original: 1 = canônico/leitura, 2 = sinal, 3 = contexto/descoberta.

insert into public.suggested_sources
  (name, description, type, url, feed_url, suggested_tier, category, country, language, is_free, requires_credential, sort_order)
values
  -- Brasil — gratuitos e confiáveis (destaques da biblioteca)
  ('G1 Tecnologia', 'Cobertura tech da maior redação do país', 'rss', 'https://g1.globo.com/tecnologia/', 'https://g1.globo.com/rss/g1/tecnologia/', 2, 'tecnologia', 'BR', 'pt-BR', true, false, 10),
  ('Agência Brasil', 'Agência pública de notícias — economia e política', 'rss', 'https://agenciabrasil.ebc.com.br', 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', 3, 'geral', 'BR', 'pt-BR', true, false, 11),
  ('InfoMoney', 'Finanças e mercado BR', 'rss', 'https://www.infomoney.com.br', 'https://www.infomoney.com.br/feed/', 2, 'economia', 'BR', 'pt-BR', true, false, 12),
  ('Tecnoblog', 'Tecnologia BR com apuração própria', 'rss', 'https://tecnoblog.net', 'https://tecnoblog.net/feed/', 2, 'tecnologia', 'BR', 'pt-BR', true, false, 13),
  ('Canaltech', 'Notícias diárias de tecnologia', 'rss', 'https://canaltech.com.br', 'https://canaltech.com.br/rss/', 3, 'tecnologia', 'BR', 'pt-BR', true, false, 14),
  ('Olhar Digital', 'Tecnologia e ciência BR', 'rss', 'https://olhardigital.com.br', 'https://olhardigital.com.br/feed/', 3, 'tecnologia', 'BR', 'pt-BR', true, false, 15),
  ('NeoFeed', 'Negócios, tech e mercado', 'rss', 'https://neofeed.com.br', 'https://neofeed.com.br/feed/', 2, 'negocios', 'BR', 'pt-BR', true, false, 16),
  ('Brazil Journal', 'Negócios e mercado de capitais', 'rss', 'https://braziljournal.com', 'https://braziljournal.com/feed/', 2, 'negocios', 'BR', 'pt-BR', true, false, 17),
  ('Exame', 'Negócios e tech BR ampliado', 'rss', 'https://exame.com', 'https://exame.com/feed/', 1, 'negocios', 'BR', 'pt-BR', true, false, 18),
  ('Folha de S.Paulo — Tec', 'Editoria de tecnologia da Folha', 'rss', 'https://www1.folha.uol.com.br/tec/', 'https://feeds.folha.uol.com.br/tec/rss091.xml', 2, 'tecnologia', 'BR', 'pt-BR', true, false, 19),
  ('Estadão Link', 'Editoria de tecnologia do Estadão', 'rss', 'https://www.estadao.com.br/link/', 'https://www.estadao.com.br/link/feed/', 2, 'tecnologia', 'BR', 'pt-BR', true, false, 20),
  ('Valor Econômico', 'Mercado BR, M&A, regulação (inclui Pipeline)', 'rss', 'https://valor.globo.com', 'https://pox.globo.com/rss/valor', 1, 'economia', 'BR', 'pt-BR', true, false, 21),
  ('The Shift', 'Tecnologia e transformação digital', 'rss', 'https://www.theshift.info', 'https://www.theshift.info/feed/', 3, 'tecnologia', 'BR', 'pt-BR', true, false, 22),
  ('Núcleo Jornalismo', 'Impacto das plataformas na sociedade', 'rss', 'https://nucleo.jor.br', 'https://nucleo.jor.br/feed/', 3, 'tecnologia', 'BR', 'pt-BR', true, false, 23),
  ('Mobile Time', 'Mercado mobile BR', 'rss', 'https://www.mobiletime.com.br', 'https://www.mobiletime.com.br/feed/', 3, 'tecnologia', 'BR', 'pt-BR', true, false, 24),
  ('Convergência Digital', 'Telecom e políticas digitais', 'rss', 'https://www.convergenciadigital.com.br', 'https://www.convergenciadigital.com.br/feed/', 3, 'tecnologia', 'BR', 'pt-BR', true, false, 25),
  -- Internacionais (universo atual do fontes.md)
  ('The Information', 'Scoops de big tech, IA e VC (assinatura)', 'rss', 'https://www.theinformation.com', 'https://www.theinformation.com/subscriber_feed', 1, 'tecnologia', 'INTL', 'en', false, true, 40),
  ('Stratechery', 'Análise estratégica de plataformas (assinatura)', 'rss', 'https://stratechery.com', null, 1, 'negocios', 'INTL', 'en', false, true, 41),
  ('The Economist', 'Contexto macro/global (assinatura)', 'rss', 'https://www.economist.com', null, 1, 'economia', 'INTL', 'en', false, true, 42),
  ('Bloomberg Technology', 'Tech + mercado global', 'rss', 'https://www.bloomberg.com/technology', 'https://feeds.bloomberg.com/technology/news.rss', 2, 'tecnologia', 'INTL', 'en', true, false, 43),
  ('Financial Times — Tech', 'Setor de tecnologia no FT', 'rss', 'https://www.ft.com/technology', 'https://www.ft.com/technology-sector?format=rss', 2, 'tecnologia', 'INTL', 'en', false, false, 44),
  ('Ars Technica', 'Tecnologia com profundidade técnica', 'rss', 'https://arstechnica.com', 'https://feeds.arstechnica.com/arstechnica/index', 2, 'tecnologia', 'INTL', 'en', true, false, 45),
  ('MIT Technology Review', 'Pesquisa e fronteira tecnológica', 'rss', 'https://www.technologyreview.com', 'https://www.technologyreview.com/feed/', 2, 'tecnologia', 'INTL', 'en', true, false, 46),
  ('Wired', 'Cultura e sociedade tech', 'rss', 'https://www.wired.com', 'https://www.wired.com/feed/rss', 2, 'tecnologia', 'INTL', 'en', true, false, 47),
  ('The Verge', 'Consumo e indústria tech', 'rss', 'https://www.theverge.com', 'https://www.theverge.com/rss/index.xml', 3, 'tecnologia', 'INTL', 'en', true, false, 48),
  ('TechCrunch', 'Startups e VC', 'rss', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 3, 'tecnologia', 'INTL', 'en', true, false, 49),
  ('404 Media', 'Jornalismo investigativo de tecnologia', 'rss', 'https://www.404media.co', 'https://www.404media.co/rss/', 2, 'tecnologia', 'INTL', 'en', true, false, 50),
  ('Platformer', 'Plataformas e democracia', 'rss', 'https://www.platformer.news', 'https://www.platformer.news/feed', 3, 'tecnologia', 'INTL', 'en', true, false, 51),
  ('Rest of World', 'Tech fora do eixo EUA/Europa', 'rss', 'https://restofworld.org', 'https://restofworld.org/feed/', 3, 'tecnologia', 'INTL', 'en', true, false, 52),
  ('Engadget', 'Gadgets e indústria', 'rss', 'https://www.engadget.com', 'https://www.engadget.com/rss.xml', 3, 'tecnologia', 'INTL', 'en', true, false, 53),
  ('CNET', 'Tecnologia de consumo', 'rss', 'https://www.cnet.com', 'https://www.cnet.com/rss/news/', 3, 'tecnologia', 'INTL', 'en', true, false, 54),
  ('Hacker News', 'Sinal da comunidade dev/founder (nunca vira link de leitura)', 'rss', 'https://news.ycombinator.com', 'https://hnrss.org/frontpage', 3, 'tecnologia', 'INTL', 'en', true, false, 55);
