import { createAdminClient } from "@briefing/db/admin";
import { NextResponse } from "next/server";

/**
 * Encurtador bnrd.me: registra o clique (analytics) e redireciona (302) para
 * a URL real — sem página intermediária visível. bnrd.me/<code> é reescrito
 * para cá pelo proxy (host-routing). Código inexistente cai na landing.
 * LGPD-light: só timestamp/user-agent/referer, sem IP.
 */
export const dynamic = "force-dynamic";

const FALLBACK = process.env.APP_BASE_URL ?? "https://briefingnerd.com";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Za-z0-9]{4,16}$/.test(code)) {
    return NextResponse.redirect(FALLBACK, 302);
  }

  const admin = createAdminClient();
  const { data: target, error } = await admin.rpc("resolve_short_link", {
    p_code: code,
    p_user_agent: request.headers.get("user-agent"),
    p_referer: request.headers.get("referer"),
  });
  if (error) console.error(`resolve_short_link ${code}: ${error.message}`);

  return NextResponse.redirect(typeof target === "string" && target ? target : FALLBACK, 302);
}
