import type { CollectOptions, FetchResult, SourceConnector, SourceLike } from "../types";

/**
 * Stub da Fase 5. O connector real usará uma API terceira (Apify ou equivalente)
 * para buscar posts das últimas 24h de um perfil e normalizar legenda + data +
 * link no shape FetchedItem. ESTE arquivo é o ponto único de troca de provedor.
 * Kill-switch global: app_config key `instagram_connector_enabled`.
 */
export class InstagramConnector implements SourceConnector {
  async validate(_source: SourceLike): Promise<FetchResult> {
    return {
      status: "error",
      method: null,
      items: [],
      latencyMs: 0,
      error: "Fontes de Instagram chegam na Fase 5 (planos com social).",
    };
  }

  async collect(_source: SourceLike, _options: CollectOptions): Promise<FetchResult> {
    return this.validate(_source);
  }
}
