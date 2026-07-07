import { describe, expect, it } from "vitest";
import { discoverFeedUrl, extractHtml, looksLikeXml, parseFeed } from "./feed-parser";

const NOW = Date.now();
const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * 3600_000).toUTCString();

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Portal Teste</title>
  <item>
    <title>Notícia recente &amp; importante</title>
    <link>https://portal.test/a?utm_source=rss</link>
    <pubDate>${iso(2)}</pubDate>
    <description><![CDATA[<p>Resumo com <b>HTML</b> embutido.</p>]]></description>
  </item>
  <item>
    <title>Notícia velha</title>
    <link>https://portal.test/b</link>
    <pubDate>${iso(100)}</pubDate>
    <description>Fora da janela de 48h</description>
  </item>
</channel></rss>`;

const ATOM_FIXTURE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Feed Atom</title>
  <entry>
    <title>Entrada atom</title>
    <link rel="alternate" href="https://atom.test/post-1"/>
    <updated>${new Date(NOW - 3600_000).toISOString()}</updated>
    <summary>resumo atom</summary>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parseia RSS, limpa HTML do resumo e filtra pela janela", () => {
    const feed = parseFeed(RSS_FIXTURE, { windowHours: 48 });
    expect(feed?.feedType).toBe("rss");
    expect(feed?.totalItems).toBe(2);
    expect(feed?.items).toHaveLength(1);
    expect(feed?.items[0]?.title).toBe("Notícia recente & importante");
    expect(feed?.items[0]?.summary).toBe("Resumo com HTML embutido.");
    expect(feed?.items[0]?.publishedAt).toMatch(/T/);
  });

  it("sem janela retorna tudo (validação/preview)", () => {
    const feed = parseFeed(RSS_FIXTURE, {});
    expect(feed?.items).toHaveLength(2);
  });

  it("parseia Atom com link rel=alternate", () => {
    const feed = parseFeed(ATOM_FIXTURE, { windowHours: 48 });
    expect(feed?.feedType).toBe("atom");
    expect(feed?.items[0]?.url).toBe("https://atom.test/post-1");
  });

  it("retorna null para não-feed", () => {
    expect(parseFeed("<html><body>oi</body></html>")).toBeNull();
    expect(parseFeed("not xml at all")).toBeNull();
  });
});

describe("extractHtml", () => {
  it("prefere <article> e remove scripts", () => {
    const html = `<html><head><title>Página X</title></head><body>
      <nav>menu enorme</nav>
      <article><script>evil()</script><p>Conteúdo principal do artigo.</p></article>
    </body></html>`;
    const out = extractHtml(html);
    expect(out.title).toBe("Página X");
    expect(out.text).toBe("Conteúdo principal do artigo.");
    expect(out.text).not.toContain("menu");
  });
});

describe("looksLikeXml / discoverFeedUrl", () => {
  it("detecta xml por content-type e por corpo", () => {
    expect(looksLikeXml("...", "application/rss+xml")).toBe(true);
    expect(looksLikeXml('<?xml version="1.0"?><rss>', "text/plain")).toBe(true);
    expect(looksLikeXml("<html>", "text/html")).toBe(false);
  });

  it("descobre feed no <head> e resolve URL relativa", () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" href="/feed/" title="RSS">
    </head><body></body></html>`;
    expect(discoverFeedUrl(html, "https://portal.test/home")).toBe("https://portal.test/feed/");
    expect(discoverFeedUrl("<html></html>", "https://portal.test")).toBeNull();
  });
});
