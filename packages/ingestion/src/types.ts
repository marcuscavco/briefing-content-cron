export type SourceType = "rss" | "web" | "instagram";

export type HealthStatus = "pending" | "ok" | "partial" | "blocked" | "error";

export type FetchMethod = "rss" | "feed_discovery" | "web_extract" | "title_only";

/** Shape mínimo de uma fonte para os connectors (subset da row de `sources`). */
export interface SourceLike {
  type: SourceType;
  url: string;
  feed_url?: string | null;
  handle?: string | null;
  /** Credencial já decifrada (ex.: URL de feed de assinante). Server-only. */
  credential?: string | null;
}

/** Item normalizado — mesmo shape para RSS, web e (Fase 5) Instagram. */
export interface FetchedItem {
  title: string;
  url: string;
  publishedAt: string | null; // ISO 8601
  summary: string;
  /** Mídia principal (thumb do post no Instagram; opcional em RSS). */
  image?: string | null;
}

export interface FetchResult {
  status: HealthStatus;
  method: FetchMethod | null;
  items: FetchedItem[];
  latencyMs: number;
  error?: string;
  /** Preenchido quando a validação descobriu o feed a partir da homepage. */
  discoveredFeedUrl?: string;
}

export interface CollectOptions {
  windowHours: number;
  maxItems?: number;
}

/**
 * Contrato único de ingestão. Trocar de provedor (ex.: Apify no Instagram)
 * significa trocar a implementação — o motor de curadoria só conhece FetchedItem.
 */
export interface SourceConnector {
  /** Testa a fonte na hora da adição: status + preview de itens. */
  validate(source: SourceLike): Promise<FetchResult>;
  /** Coleta itens da janela para o pipeline de curadoria. */
  collect(source: SourceLike, options: CollectOptions): Promise<FetchResult>;
}
