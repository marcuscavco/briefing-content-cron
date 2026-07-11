import {
  discoverFeedUrl,
  extractHtml,
  looksLikeXml,
  parseFeed,
} from "../feed-parser";
import type { Transport } from "../transport";
import type {
  CollectOptions,
  FetchResult,
  SourceConnector,
  SourceLike,
} from "../types";

const PREVIEW_MAX_ITEMS = 10;

function blockedStatus(httpStatus: number): boolean {
  return httpStatus === 401 || httpStatus === 403 || httpStatus === 451 || httpStatus === 429;
}

/**
 * Connector RSS/web com a cascata da Fase 1:
 *   feed conhecido → descoberta de feed na homepage → extração do HTML
 *   (readability simplificada) → falha marcada sem derrubar o fluxo.
 */
export class RssConnector implements SourceConnector {
  constructor(private readonly transport: Transport) {}

  async validate(source: SourceLike): Promise<FetchResult> {
    return this.fetchWithCascade(source, { windowHours: 0, maxItems: PREVIEW_MAX_ITEMS });
  }

  async collect(source: SourceLike, options: CollectOptions): Promise<FetchResult> {
    return this.fetchWithCascade(source, options);
  }

  private async fetchWithCascade(
    source: SourceLike,
    { windowHours, maxItems }: CollectOptions,
  ): Promise<FetchResult> {
    const started = Date.now();
    const parseOptions = {
      windowHours: windowHours > 0 ? windowHours : undefined,
      maxItems,
    };
    const done = (partial: Omit<FetchResult, "latencyMs">): FetchResult => ({
      ...partial,
      latencyMs: Date.now() - started,
    });

    // A credencial de fonte é uma URL de feed de assinante (ex.: Stratechery com token).
    const feedUrl = source.credential?.trim() || source.feed_url?.trim() || null;

    // Etapa 1 — feed conhecido
    if (feedUrl) {
      try {
        const res = await this.transport(feedUrl);
        if (!res.ok) {
          return done({
            status: blockedStatus(res.status) ? "blocked" : "error",
            method: "rss",
            items: [],
            error: `feed retornou HTTP ${res.status}`,
          });
        }
        const feed = parseFeed(res.body, parseOptions);
        if (feed) {
          return done({ status: "ok", method: "rss", items: feed.items });
        }
        // Corpo não é feed (feed moveu/desativou) — segue a cascata pela homepage.
      } catch (e) {
        return done({
          status: "error",
          method: "rss",
          items: [],
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Etapa 2 — homepage: descoberta de feed ou extração de conteúdo
    try {
      const res = await this.transport(source.url);
      if (!res.ok) {
        return done({
          status: blockedStatus(res.status) ? "blocked" : "error",
          method: feedUrl ? "rss" : "web_extract",
          items: [],
          error: `HTTP ${res.status} em ${source.url}`,
        });
      }

      // Homepage já é um feed? (comum quando o usuário cola a URL do feed no campo site)
      if (looksLikeXml(res.body, res.contentType)) {
        const feed = parseFeed(res.body, parseOptions);
        if (feed) {
          return done({
            status: "ok",
            method: "rss",
            items: feed.items,
            discoveredFeedUrl: source.url,
          });
        }
      }

      const discovered = discoverFeedUrl(res.body, source.url);
      if (discovered && discovered !== feedUrl) {
        const feedRes = await this.transport(discovered);
        if (feedRes.ok) {
          const feed = parseFeed(feedRes.body, parseOptions);
          if (feed) {
            return done({
              status: "ok",
              method: "feed_discovery",
              items: feed.items,
              discoveredFeedUrl: discovered,
            });
          }
        }
      }

      // Etapa 3 — sem feed utilizável: extrai o que der da página (degradação graciosa)
      const html = extractHtml(res.body);
      if (html.title || html.text) {
        return done({
          status: "partial",
          method: "title_only",
          items: html.title
            ? [
                {
                  title: html.title,
                  url: source.url,
                  publishedAt: null,
                  summary: html.text.slice(0, 300),
                },
              ]
            : [],
          error: feedUrl ? "feed inválido; página acessível sem feed utilizável" : undefined,
        });
      }

      return done({
        status: "error",
        method: null,
        items: [],
        error: "página sem feed e sem conteúdo extraível",
      });
    } catch (e) {
      return done({
        status: "error",
        method: null,
        items: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
