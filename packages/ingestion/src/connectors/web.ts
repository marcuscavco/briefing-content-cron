import { extractHtml } from "../feed-parser";
import type { Transport } from "../transport";
import type { CollectOptions, FetchResult, SourceConnector, SourceLike } from "../types";

/**
 * Connector para páginas web sem feed: extrai o conteúdo do <article>/<main>.
 * Na Fase 2 é ele quem busca o corpo dos artigos Tier 1 canônicos para o TL;DR.
 */
export class WebConnector implements SourceConnector {
  constructor(private readonly transport: Transport) {}

  async validate(source: SourceLike): Promise<FetchResult> {
    return this.fetchPage(source);
  }

  async collect(source: SourceLike, _options: CollectOptions): Promise<FetchResult> {
    return this.fetchPage(source);
  }

  private async fetchPage(source: SourceLike): Promise<FetchResult> {
    const started = Date.now();
    try {
      const res = await this.transport(source.url);
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        const blocked = res.status === 401 || res.status === 403 || res.status === 451 || res.status === 429;
        return {
          status: blocked ? "blocked" : "error",
          method: "web_extract",
          items: [],
          latencyMs,
          error: `HTTP ${res.status} em ${source.url}`,
        };
      }
      const html = extractHtml(res.body);
      if (!html.title && !html.text) {
        return {
          status: "error",
          method: "web_extract",
          items: [],
          latencyMs,
          error: "sem conteúdo extraível",
        };
      }
      return {
        status: html.text.length > 500 ? "ok" : "partial",
        method: "web_extract",
        items: [
          {
            title: html.title || source.url,
            url: source.url,
            publishedAt: null,
            summary: html.text.slice(0, 500),
          },
        ],
        latencyMs,
      };
    } catch (e) {
      return {
        status: "error",
        method: "web_extract",
        items: [],
        latencyMs: Date.now() - started,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
