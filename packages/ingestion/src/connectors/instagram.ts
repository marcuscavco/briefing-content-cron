import type { CollectOptions, FetchedItem, FetchResult, SourceConnector, SourceLike } from "../types";

/**
 * Fase 5: connector de Instagram via API terceira, ISOLADO atrás da interface
 * InstagramFetcher — este arquivo é o ponto único de troca de provedor
 * (implementação real: ApifyInstagramFetcher em providers/apify.ts).
 *
 * Regras de produto:
 * - Janela do IG é de NO MÁXIMO 24h (decisão do Marcus): post de rede social
 *   envelhece mais rápido que notícia; a janela do profile só encolhe isso.
 * - Legenda vira o conteúdo; a transcrição de vídeo entra quando o provedor
 *   fornecer (campo transcript — extension point, hoje o Apify não transcreve).
 * - Kill-switch global (app_config `instagram_connector_enabled`) e feature
 *   por plano são checados no PIPELINE (precisa de DB) — o connector só coleta.
 */

export const INSTAGRAM_WINDOW_HOURS_MAX = 24;

export interface InstagramPost {
  url: string; // permalink do post
  caption: string | null;
  timestamp: string; // ISO 8601
  isVideo?: boolean;
  /** Transcrição da fala do vídeo, quando o provedor fornecer. */
  transcript?: string | null;
}

export interface InstagramFetcher {
  /** Posts mais recentes do perfil, do mais novo para o mais velho. */
  fetchRecentPosts(handle: string, limit: number): Promise<InstagramPost[]>;
}

function normalize(post: InstagramPost): FetchedItem {
  const caption = (post.caption ?? "").trim();
  const firstLine = caption.split("\n")[0]?.trim() ?? "";
  const title = firstLine ? firstLine.slice(0, 140) : "(post sem legenda)";
  const summary = post.transcript
    ? `${caption}\n\n[transcrição do vídeo] ${post.transcript}`.trim()
    : caption;
  return { title, url: post.url, publishedAt: post.timestamp, summary };
}

export class InstagramConnector implements SourceConnector {
  constructor(
    private readonly fetcher?: InstagramFetcher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async validate(source: SourceLike): Promise<FetchResult> {
    const start = Date.now();
    if (!source.handle) {
      return { status: "error", method: null, items: [], latencyMs: 0, error: "handle do perfil é obrigatório" };
    }
    if (!this.fetcher) {
      return {
        status: "error",
        method: null,
        items: [],
        latencyMs: 0,
        error: "provedor de Instagram não configurado (APIFY_TOKEN ausente)",
      };
    }
    try {
      const posts = await this.fetcher.fetchRecentPosts(source.handle, 5);
      return {
        status: "ok",
        method: null,
        items: posts.map(normalize),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        status: "error",
        method: null,
        items: [],
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async collect(source: SourceLike, options: CollectOptions): Promise<FetchResult> {
    const start = Date.now();
    if (!source.handle || !this.fetcher) return this.validate(source);

    const windowHours = Math.min(options.windowHours, INSTAGRAM_WINDOW_HOURS_MAX);
    const cutoff = this.now().getTime() - windowHours * 3_600_000;
    try {
      const posts = await this.fetcher.fetchRecentPosts(source.handle, options.maxItems ?? 20);
      const items = posts
        .filter((p) => new Date(p.timestamp).getTime() >= cutoff)
        .map(normalize);
      return { status: "ok", method: null, items, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: "error",
        method: null,
        items: [],
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
