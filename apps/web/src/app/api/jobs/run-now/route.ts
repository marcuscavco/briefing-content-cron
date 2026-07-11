import { createAdminClient } from "@briefing/db/admin";
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { processQueue } from "@/lib/worker";

/**
 * "Gerar briefing agora": enfileira o job de hoje do usuário autenticado e
 * processa inline (Fluid Compute). Se já existe job do dia, reprocessa a fila
 * (retoma de onde parou). RLS cobre o insert; o processamento usa service role.
 */
export const maxDuration = 300; // Hobby: teto Fluid 300s; Pro destrava 800s

export async function POST() {
  const { supabase, accountId, profile } = await requireTenant();

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
    const admin = createAdminClient();
    await admin
      .from("jobs")
      .update({ status: "queued", error: null, locked_at: null, locked_by: null })
      .eq("profile_id", profile.id)
      .eq("run_date", today)
      .in("status", ["failed"]);
  }

  const admin = createAdminClient();
  const summary = await processQueue(admin, `manual-${accountId.slice(0, 8)}`);

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, stage, error, result, tokens_input, tokens_output, cost_usd")
    .eq("profile_id", profile.id)
    .eq("run_date", today)
    .single();

  return NextResponse.json({ job, worker: summary });
}
