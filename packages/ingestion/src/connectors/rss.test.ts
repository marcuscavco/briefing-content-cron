import { describe, expect, it } from "vitest";
import type { Transport, TransportResponse } from "../transport";
import { RssConnector } from "./rss";

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel>
  <title>T</title>
  <item><title>Item 1</title><link>https://x.test/1</link>
    <pubDate>${new Date().toUTCString()}</pubDate><description>d</description></item>
</channel></rss>`;

const HOMEPAGE_WITH_FEED = `<html><head>
  <link rel="alternate" type="application/rss+xml" href="https://x.test/feed.xml">
</head><body><main><p>home</p></main></body></html>`;

const HOMEPAGE_NO_FEED = `<html><head><title>Portal Sem Feed</title></head>
<body><article><p>${"conteúdo ".repeat(30)}</p></article></body></html>`;

function fakeTransport(routes: Record<string, Partial<TransportResponse>>): Transport {
  return async (url: string) => {
    const r = routes[url];
    if (!r) return { ok: false, status: 404, contentType: "", body: "not found" };
    return { ok: r.ok ?? true, status: r.status ?? 200, contentType: r.contentType ?? "", body: r.body ?? "" };
  };
}

describe("RssConnector — cascata", () => {
  it("etapa 1: feed conhecido funciona", async () => {
    const c = new RssConnector(
      fakeTransport({ "https://x.test/feed.xml": { body: FEED, contentType: "application/rss+xml" } }),
    );
    const out = await c.validate({ type: "rss", url: "https://x.test", feed_url: "https://x.test/feed.xml" });
    expect(out.status).toBe("ok");
    expect(out.method).toBe("rss");
    expect(out.items).toHaveLength(1);
  });

  it("etapa 2: sem feed_url, descobre o feed na homepage", async () => {
    const c = new RssConnector(
      fakeTransport({
        "https://x.test": { body: HOMEPAGE_WITH_FEED, contentType: "text/html" },
        "https://x.test/feed.xml": { body: FEED, contentType: "application/rss+xml" },
      }),
    );
    const out = await c.validate({ type: "rss", url: "https://x.test" });
    expect(out.status).toBe("ok");
    expect(out.method).toBe("feed_discovery");
    expect(out.discoveredFeedUrl).toBe("https://x.test/feed.xml");
  });

  it("etapa 3: página sem feed degrada para title_only (partial)", async () => {
    const c = new RssConnector(
      fakeTransport({ "https://x.test": { body: HOMEPAGE_NO_FEED, contentType: "text/html" } }),
    );
    const out = await c.validate({ type: "rss", url: "https://x.test" });
    expect(out.status).toBe("partial");
    expect(out.method).toBe("title_only");
    expect(out.items[0]?.title).toBe("Portal Sem Feed");
  });

  it("403 marca como blocked (não error)", async () => {
    const c = new RssConnector(
      fakeTransport({ "https://x.test/feed.xml": { ok: false, status: 403, body: "forbidden" } }),
    );
    const out = await c.validate({ type: "rss", url: "https://x.test", feed_url: "https://x.test/feed.xml" });
    expect(out.status).toBe("blocked");
  });

  it("feed quebrado cai na cascata da homepage em vez de falhar", async () => {
    const c = new RssConnector(
      fakeTransport({
        "https://x.test/feed-morto.xml": { body: "<html>página de erro</html>", contentType: "text/html" },
        "https://x.test": { body: HOMEPAGE_WITH_FEED, contentType: "text/html" },
        "https://x.test/feed.xml": { body: FEED, contentType: "application/rss+xml" },
      }),
    );
    const out = await c.validate({
      type: "rss",
      url: "https://x.test",
      feed_url: "https://x.test/feed-morto.xml",
    });
    expect(out.status).toBe("ok");
    expect(out.method).toBe("feed_discovery");
  });

  it("credencial (feed de assinante) tem precedência sobre feed_url", async () => {
    const c = new RssConnector(
      fakeTransport({
        "https://x.test/feed.xml?token=abc": { body: FEED, contentType: "application/rss+xml" },
      }),
    );
    const out = await c.validate({
      type: "rss",
      url: "https://x.test",
      feed_url: "https://x.test/feed-publico.xml",
      credential: "https://x.test/feed.xml?token=abc",
    });
    expect(out.status).toBe("ok");
  });
});
