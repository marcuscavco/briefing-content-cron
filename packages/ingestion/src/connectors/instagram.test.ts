import { describe, expect, it } from "vitest";
import {
  INSTAGRAM_WINDOW_HOURS_MAX,
  InstagramConnector,
  type InstagramFetcher,
  type InstagramPost,
} from "./instagram";

const NOW = new Date("2026-07-09T12:00:00Z");

function post(hoursAgo: number, overrides: Partial<InstagramPost> = {}): InstagramPost {
  return {
    url: `https://www.instagram.com/p/abc${hoursAgo}/`,
    caption: "Primeira linha da legenda\nSegunda linha com detalhes.",
    timestamp: new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString(),
    ...overrides,
  };
}

class FakeFetcher implements InstagramFetcher {
  calls: { handle: string; limit: number }[] = [];
  constructor(private posts: InstagramPost[]) {}
  async fetchRecentPosts(handle: string, limit: number) {
    this.calls.push({ handle, limit });
    return this.posts;
  }
}

describe("InstagramConnector", () => {
  it("normaliza post: legenda vira título (1ª linha) e summary; permalink é a URL", async () => {
    const connector = new InstagramConnector(new FakeFetcher([post(2)]), () => NOW);
    const result = await connector.collect(
      { type: "instagram", url: "https://www.instagram.com/x/", handle: "x" },
      { windowHours: 48 },
    );
    expect(result.status).toBe("ok");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.title).toBe("Primeira linha da legenda");
    expect(result.items[0]!.summary).toContain("Segunda linha");
    expect(result.items[0]!.url).toContain("instagram.com/p/");
  });

  it("janela é CAPADA em 24h mesmo com windowHours maior (regra do produto)", async () => {
    const fetcher = new FakeFetcher([post(2), post(20), post(30), post(47)]);
    const connector = new InstagramConnector(fetcher, () => NOW);
    const result = await connector.collect(
      { type: "instagram", url: "https://www.instagram.com/x/", handle: "x" },
      { windowHours: 48 }, // janela do profile é 48h, mas IG corta em 24h
    );
    expect(INSTAGRAM_WINDOW_HOURS_MAX).toBe(24);
    expect(result.items).toHaveLength(2); // só 2h e 20h atrás
  });

  it("transcrição de vídeo entra no summary quando o provedor fornecer", async () => {
    const connector = new InstagramConnector(
      new FakeFetcher([post(1, { isVideo: true, transcript: "fala do vídeo aqui" })]),
      () => NOW,
    );
    const result = await connector.collect(
      { type: "instagram", url: "https://www.instagram.com/x/", handle: "x" },
      { windowHours: 24 },
    );
    expect(result.items[0]!.summary).toContain("[transcrição do vídeo] fala do vídeo aqui");
  });

  it("post sem legenda ganha título placeholder", async () => {
    const connector = new InstagramConnector(new FakeFetcher([post(1, { caption: null })]), () => NOW);
    const result = await connector.collect(
      { type: "instagram", url: "https://www.instagram.com/x/", handle: "x" },
      { windowHours: 24 },
    );
    expect(result.items[0]!.title).toBe("(post sem legenda)");
  });

  it("sem provedor configurado → erro claro; sem handle → erro claro", async () => {
    const semFetcher = new InstagramConnector(undefined, () => NOW);
    const r1 = await semFetcher.collect(
      { type: "instagram", url: "https://www.instagram.com/x/", handle: "x" },
      { windowHours: 24 },
    );
    expect(r1.status).toBe("error");
    expect(r1.error).toContain("APIFY_TOKEN");

    const r2 = await new InstagramConnector(new FakeFetcher([]), () => NOW).validate({
      type: "instagram",
      url: "https://www.instagram.com/x/",
      handle: null,
    });
    expect(r2.status).toBe("error");
    expect(r2.error).toContain("handle");
  });

  it("erro do provedor vira status error sem lançar", async () => {
    const broken: InstagramFetcher = {
      async fetchRecentPosts() {
        throw new Error("Apify 402: sem créditos");
      },
    };
    const connector = new InstagramConnector(broken, () => NOW);
    const result = await connector.collect(
      { type: "instagram", url: "https://www.instagram.com/x/", handle: "x" },
      { windowHours: 24 },
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Apify 402");
  });
});
