import type { InstagramFetcher, InstagramPost } from "../connectors/instagram";

/**
 * Provedor real do Instagram: Apify (actor apify/instagram-scraper) via
 * run-sync — uma chamada HTTP retorna os itens do dataset. Trocar de provedor
 * = escrever outra classe com a mesma interface InstagramFetcher.
 *
 * Custo/limites: o run-sync tem teto de ~5min; usamos resultsLimit pequeno e
 * onlyPostsNewerThan de 1 dia (janela máxima do IG no produto). Sem transcrição
 * de vídeo neste provedor — o campo transcript fica null (extension point).
 */

type ApifyItem = {
  url?: string;
  caption?: string | null;
  timestamp?: string;
  type?: string; // 'Image' | 'Video' | 'Sidecar'
};

export class ApifyInstagramFetcher implements InstagramFetcher {
  constructor(
    private readonly token = process.env.APIFY_TOKEN,
    private readonly actor = "apify~instagram-scraper",
  ) {
    if (!this.token) throw new Error("APIFY_TOKEN não configurado");
  }

  async fetchRecentPosts(handle: string, limit: number): Promise<InstagramPost[]> {
    const clean = handle.replace(/^@/, "").trim();
    const res = await fetch(
      `https://api.apify.com/v2/acts/${this.actor}/run-sync-get-dataset-items?token=${this.token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${clean}/`],
          resultsType: "posts",
          resultsLimit: Math.min(limit, 30),
          onlyPostsNewerThan: "1 day",
        }),
        signal: AbortSignal.timeout(240_000),
      },
    );
    if (!res.ok) {
      throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const items = (await res.json()) as ApifyItem[];
    return items
      .filter((i) => i.url && i.timestamp)
      .map((i) => ({
        url: i.url!,
        caption: i.caption ?? null,
        timestamp: i.timestamp!,
        isVideo: i.type === "Video",
        transcript: null,
      }));
  }
}
