/**
 * Transporte de fetch externo. Princípio herdado do legado: em produção, todo
 * fetch de conteúdo passa pelo Worker `rss-proxy` allowlistado (egress estável,
 * headers de browser, sem expor a infra da plataforma). Em dev/teste, sem as
 * envs do proxy, cai em fetch direto.
 */

export interface TransportResponse {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
}

export type Transport = (url: string) => Promise<TransportResponse>;

const FETCH_TIMEOUT_MS = 15_000;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US,en;q=0.8",
};

async function toTransportResponse(res: Response): Promise<TransportResponse> {
  return {
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get("Content-Type") ?? "",
    body: await res.text(),
  };
}

export function createTransport(env: {
  proxyUrl?: string;
  proxyToken?: string;
} = {}): Transport {
  const proxyUrl = env.proxyUrl ?? process.env.RSS_PROXY_URL;
  const proxyToken = env.proxyToken ?? process.env.RSS_PROXY_TOKEN;

  if (proxyUrl && proxyToken) {
    return async (url: string) => {
      const target = `${proxyUrl}?token=${encodeURIComponent(proxyToken)}&url=${encodeURIComponent(url)}`;
      const res = await fetch(target, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      return toTransportResponse(res);
    };
  }

  return async (url: string) => {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return toTransportResponse(res);
  };
}
