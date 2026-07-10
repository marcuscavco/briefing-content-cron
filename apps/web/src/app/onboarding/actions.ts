"use server";

import { getConnector } from "@briefing/ingestion";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

/**
 * Server actions do onboarding guiado. Cada passo persiste ao avançar —
 * quem abandona retoma de onde parou. O passo do WhatsApp reusa as actions
 * de settings/delivery-actions (double opt-in real).
 */

export async function saveBriefingName(name: string): Promise<{ ok: boolean; error?: string }> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Dê um nome ao seu briefing." };
  const { supabase, profile } = await requireTenant();
  const { error } = await supabase
    .from("briefing_profiles")
    .update({ name: clean, updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveThemes(labels: string[]): Promise<{ ok: boolean; error?: string }> {
  if (labels.length === 0) return { ok: false, error: "Escolha pelo menos um tema." };
  const { supabase, profile } = await requireTenant();
  const { error } = await supabase
    .from("briefing_profiles")
    .update({ themes: labels.slice(0, 60), updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Insere as fontes sugeridas confirmadas (validação fica para a amostra/coleta). */
export async function confirmSources(
  suggestedIds: string[],
): Promise<{ ok: boolean; added: number; error?: string }> {
  if (suggestedIds.length === 0) {
    return { ok: false, added: 0, error: "Escolha pelo menos uma fonte." };
  }
  const { supabase, accountId, profile } = await requireTenant();
  const { data: suggestions } = await supabase
    .from("suggested_sources")
    .select("*")
    .in("id", suggestedIds.slice(0, 12));

  let added = 0;
  for (const s of suggestions ?? []) {
    const { error } = await supabase.from("sources").insert({
      account_id: accountId,
      profile_id: profile.id,
      name: s.name,
      type: s.type,
      url: s.url,
      feed_url: s.feed_url,
      tier: s.suggested_tier,
      fallback_eligible: s.fallback_eligible,
    });
    if (!error) added++;
    else if (error.code !== "23505") return { ok: false, added, error: error.message };
  }
  revalidatePath("/sources");
  return { ok: true, added };
}

export interface SampleSource {
  portal: string;
  items: { title: string; url: string; publishedAt: string | null; summary?: string | null; image?: string | null }[];
}

/** Amostra REAL para a revisão: últimas 48h de até 2 fontes da conta. */
export async function sampleHeadlines(): Promise<SampleSource[]> {
  const { supabase, profile } = await requireTenant();
  const { data: sources } = await supabase
    .from("sources")
    .select("name, type, url, feed_url, handle")
    .eq("profile_id", profile.id)
    .eq("active", true)
    .neq("type", "instagram")
    .order("tier")
    .limit(2);

  const out: SampleSource[] = [];
  await Promise.all(
    (sources ?? []).map(async (s) => {
      try {
        const connector = getConnector(s.type);
        const result = await connector.collect(
          { type: s.type, url: s.url, feed_url: s.feed_url, handle: s.handle },
          { windowHours: 48, maxItems: 3 },
        );
        if (result.items.length > 0) {
          out.push({
            portal: s.name,
            items: result.items.slice(0, 3).map((i) => ({
              title: i.title,
              url: i.url,
              publishedAt: i.publishedAt,
              summary: i.summary ? i.summary.replace(/\s+/g, " ").slice(0, 160) : null,
              image: i.image ?? null,
            })),
          });
        }
      } catch {
        /* amostra é melhor esforço — nunca trava o onboarding */
      }
    }),
  );
  return out;
}

/** Conclusão: liga o canal WhatsApp (destino verificado é obrigatório) e marca onboarded. */
export async function finishOnboarding(): Promise<{ ok: boolean; error?: string }> {
  const { supabase, profile } = await requireTenant();

  const { count } = await supabase
    .from("whatsapp_destinations")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("verified", true);
  if (!count) return { ok: false, error: "Verifique um número de WhatsApp antes de concluir." };

  const channels = { ...((profile.channels as object) ?? {}), whatsapp: true, email: false };
  const { error } = await supabase
    .from("briefing_profiles")
    .update({ channels, onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) return { ok: false, error: error.message };

  // Enfileira o 1º briefing AQUI (sem corrida com o redirect): o dashboard já
  // encontra o job queued e mostra "preparando"; o POST /api/jobs/run-now do
  // cliente só processa a fila.
  const runDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone ?? "America/Sao_Paulo",
  }).format(new Date());
  const { error: jobError } = await supabase.from("jobs").insert({
    account_id: profile.account_id,
    profile_id: profile.id,
    type: "briefing",
    run_date: runDate,
  });
  if (jobError && jobError.code !== "23505") {
    // não bloqueia a conclusão — o cron das 7h cobre
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
