import { createAdminClient } from "@briefing/db/admin";
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { processQueue } from "@/lib/worker";

/**
 * Geração manual. Qualquer usuário autenticado pode chamar: enfileira o job de
 * hoje e SEMPRE processa a fila inteira inline (Fluid Compute) — inclusive jobs
 * pendentes de outras contas. A restrição "gerar de novo é só pra admin" vive
 * apenas no frontend (o botão do dashboard some pra usuário comum); aqui não há
 * gate. RLS cobre o insert; o processamento usa service role.
 */
export const maxDuration = 300; // Hobby: teto Fluid 300s; Pro destrava 800s

export async function POST() {
  const { supabase, accountId, profile } = await requireTenant();

  // Paywall (Fase 6): geração manual segue a mesma regra do dispatch diário —
  // só assinante vigente. O briefing gratuito do onboarding não passa por aqui.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("account_id", accountId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (!sub) {
    return NextResponse.json(
      { error: "Assine um plano para gerar novos briefings." },
      { status: 402 },
    );
  }

  const admin = createAdminClient();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone ?? "America/Sao_Paulo",
  }).format(new Date());

  // insert com a sessão do usuário (RLS valida a account); conflito = job já existe
  const { error } = await supabase.from("jobs").insert({
    account_id: accountId,
    profile_id: profile.id,
    type: "daily_briefing",
    run_date: today,
  });
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error?.code === "23505") {
    // já existe: se falhou, devolve à fila para reprocessar
    await admin
      .from("jobs")
      .update({ status: "queued", error: null, locked_at: null, locked_by: null })
      .eq("profile_id", profile.id)
      .eq("type", "daily_briefing")
      .eq("run_date", today)
      .in("status", ["failed"]);
  }

  const summary = await processQueue(admin, `manual-${accountId.slice(0, 8)}`);

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, stage, error, result, tokens_input, tokens_output, cost_usd")
    .eq("profile_id", profile.id)
    .eq("type", "daily_briefing")
    .eq("run_date", today)
    .maybeSingle();

  return NextResponse.json({ job, worker: summary });
}
