import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy de imagem para thumbs do Instagram: o CDN deles bloqueia hotlink no
 * browser, mas serve normalmente para requests server-side. Allowlist fechada
 * — isto NÃO é um proxy aberto.
 */
const ALLOWED_HOSTS = [/\.cdninstagram\.com$/, /\.fbcdn\.net$/];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("missing u", { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.some((re) => re.test(url.hostname))) {
    return new NextResponse("host not allowed", { status: 403 });
  }

  const upstream = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("upstream error", { status: 502 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      // URLs assinadas do CDN expiram — cache curto no edge resolve o comum
      "cache-control": "public, max-age=3600, s-maxage=21600",
    },
  });
}
