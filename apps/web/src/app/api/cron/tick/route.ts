import { NextResponse } from "next/server";
import { tick } from "@/lib/worker";

/**
 * Tick do motor (Vercel Cron diário 10h UTC = 7h BRT no Hobby; no Pro o
 * cron pode rodar a cada 15min — vercel.json). Fluid Compute:
 * maioria do tempo é I/O-wait da API Claude, maxDuration dá o teto.
 * Auth: Vercel envia Authorization: Bearer ${CRON_SECRET} automaticamente.
 */
export const maxDuration = 300; // Hobby: teto Fluid 300s; Pro destrava 800s
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workerId = `cron-${crypto.randomUUID().slice(0, 8)}`;
  const result = await tick(workerId);
  return NextResponse.json(result);
}
