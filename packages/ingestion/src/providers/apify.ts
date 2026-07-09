import type { InstagramFetcher, InstagramPost, InstagramProfileInfo } from "../connectors/instagram";

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
  displayUrl?: string; // thumb/capa (presente também em vídeos)
  images?: string[];
  error?: string;
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
    if (items.length === 1 && items[0]?.error === "not_found") {
      throw new Error("perfil não encontrado no Instagram");
    }
    return items
      .filter((i) => i.url && i.timestamp)
      .map((i) => ({
        url: i.url!,
        caption: i.caption ?? null,
        timestamp: i.timestamp!,
        imageUrl: i.displayUrl ?? i.images?.[0] ?? null,
        isVideo: i.type === "Video",
        transcript: null,
      }));
  }

  /**
   * Existência do perfil via modo `details` (1 resultado, ~6-8s): perfil real
   * volta com nome/seguidores; inexistente volta `error: not_found`. Usado
   * como fallback quando a checagem leve da API web do IG é bloqueada.
   */
  async fetchProfile(handle: string): Promise<InstagramProfileInfo> {
    const clean = handle.replace(/^@/, "").trim();
    const res = await fetch(
      `https://api.apify.com/v2/acts/${this.actor}/run-sync-get-dataset-items?token=${this.token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${clean}/`],
          resultsType: "details",
          resultsLimit: 1,
        }),
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!res.ok) return { exists: null };
    const items = (await res.json()) as {
      username?: string;
      fullName?: string;
      followersCount?: number;
      private?: boolean;
      error?: string;
    }[];
    const first = items[0];
    if (!first) return { exists: null };
    if (first.error === "not_found") return { exists: false };
    if (!first.username) return { exists: null };
    return {
      exists: true,
      fullName: first.fullName ?? null,
      followers: first.followersCount ?? null,
      isPrivate: Boolean(first.private),
    };
  }
}
