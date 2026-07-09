"use server";

import {
  decryptCredential,
  encryptCredential,
  ApifyInstagramFetcher,
  getConnector,
  type FetchResult,
  type InstagramFetcher,
  type SourceType,
} from "@briefing/ingestion";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

export interface AddSourceResult {
  ok: boolean;
  status?: FetchResult["status"];
  method?: FetchResult["method"];
  itemCount?: number;
  preview?: { title: string; url: string; publishedAt: string | null }[];
  error?: string;
}

function cleanUrl(raw: string): string {
  const url = new URL(raw.trim());
  return url.toString();
}

/** Valida a fonte na hora (cascata), persiste com health + preview e loga o evento. */
/** Provedor do Instagram para validação na adição (mesmo do worker). */
function instagramFetcher(): InstagramFetcher | undefined {
  return process.env.APIFY_TOKEN ? new ApifyInstagramFetcher() : undefined;
}

async function validateAndInsert(input: {
  name: string;
  type: SourceType;
  url: string;
  feedUrl?: string | null;
  handle?: string | null;
  tier: number;
  credential?: string | null;
  fallbackEligible?: boolean;
}): Promise<AddSourceResult> {
  const { supabase, accountId, profile } = await requireTenant();

  const connector = getConnector(input.type, undefined, instagramFetcher());
  const validation = await connector.validate({
    type: input.type,
    url: input.url,
    feed_url: input.feedUrl ?? null,
    handle: input.handle ?? null,
    credential: input.credential ?? null,
  });

  const preview = validation.items.slice(0, 5).map((i) => ({
    title: i.title,
    url: i.url,
    publishedAt: i.publishedAt,
  }));

  const now = new Date().toISOString();
  const { data: source, error: insertError } = await supabase
    .from("sources")
    .insert({
      account_id: accountId,
      profile_id: profile.id,
      name: input.name,
      type: input.type,
      url: input.url,
      feed_url: validation.discoveredFeedUrl ?? input.feedUrl ?? null,
      handle: input.handle ?? null,
      tier: input.tier,
      fallback_eligible: input.fallbackEligible ?? true,
      credential_enc: input.credential ? await encryptCredential(input.credential) : null,
      last_status: validation.status,
      last_error: validation.error ?? null,
      last_checked_at: now,
      last_ok_at: validation.status === "ok" ? now : null,
      last_preview: preview,
    })
    .select("id")
    .single();

  if (insertError) {
    const duplicated = insertError.code === "23505";
    return {
      ok: false,
      error: duplicated ? "Essa fonte já existe neste briefing." : insertError.message,
    };
  }

  await supabase.from("source_health_events").insert({
    source_id: source.id,
    account_id: accountId,
    status: validation.status,
    method: validation.method,
    latency_ms: validation.latencyMs,
    items_found: validation.items.length,
    error: validation.error ?? null,
  });

  revalidatePath("/sources");
  return {
    ok: true,
    status: validation.status,
    method: validation.method,
    itemCount: validation.items.length,
    preview,
  };
}

export async function addCustomSource(
  _prev: AddSourceResult | null,
  formData: FormData,
): Promise<AddSourceResult> {
  try {
    const url = cleanUrl(String(formData.get("url")));
    const feedUrlRaw = String(formData.get("feed_url") ?? "").trim();
    const credentialRaw = String(formData.get("credential") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim() || new URL(url).hostname;
    const tier = Number(formData.get("tier") ?? 2);

    return await validateAndInsert({
      name,
      type: "rss",
      url,
      feedUrl: feedUrlRaw ? cleanUrl(feedUrlRaw) : null,
      tier: [1, 2, 3].includes(tier) ? tier : 2,
      credential: credentialRaw || null,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "URL inválida" };
  }
}

export async function addFromLibrary(formData: FormData): Promise<void> {
  const suggestedId = String(formData.get("suggested_id"));
  const { supabase } = await requireTenant();

  const { data: suggestion } = await supabase
    .from("suggested_sources")
    .select("*")
    .eq("id", suggestedId)
    .single();
  if (!suggestion) return;

  await validateAndInsert({
    name: suggestion.name,
    type: suggestion.type,
    url: suggestion.url,
    feedUrl: suggestion.feed_url,
    tier: suggestion.suggested_tier,
    fallbackEligible: suggestion.fallback_eligible,
  });
}

export async function revalidateSource(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const { supabase, accountId } = await requireTenant();

  const { data: source } = await supabase.from("sources").select("*").eq("id", id).single();
  if (!source) return;

  const connector = getConnector(source.type, undefined, instagramFetcher());
  const validation = await connector.validate({
    type: source.type,
    url: source.url,
    feed_url: source.feed_url,
    handle: source.handle,
    // Credencial só existe decifrada aqui, no server, durante o fetch.
    credential: source.credential_enc ? await decryptCredential(source.credential_enc) : null,
  });

  const now = new Date().toISOString();
  await supabase
    .from("sources")
    .update({
      feed_url: validation.discoveredFeedUrl ?? source.feed_url,
      last_status: validation.status,
      last_error: validation.error ?? null,
      last_checked_at: now,
      last_ok_at: validation.status === "ok" ? now : source.last_ok_at,
      last_preview: validation.items.slice(0, 5).map((i) => ({
        title: i.title,
        url: i.url,
        publishedAt: i.publishedAt,
      })),
      updated_at: now,
    })
    .eq("id", id);

  await supabase.from("source_health_events").insert({
    source_id: id,
    account_id: accountId,
    status: validation.status,
    method: validation.method,
    latency_ms: validation.latencyMs,
    items_found: validation.items.length,
    error: validation.error ?? null,
  });

  revalidatePath("/sources");
}

export async function toggleSourceActive(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const { supabase } = await requireTenant();
  await supabase.from("sources").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/sources");
}

export async function deleteSource(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const { supabase } = await requireTenant();
  await supabase.from("sources").delete().eq("id", id);
  revalidatePath("/sources");
}

/** Fase 5: adicionar perfil do Instagram como fonte (gated por plano). */
export async function addInstagramSource(
  _prev: AddSourceResult | null,
  formData: FormData,
): Promise<AddSourceResult> {
  try {
    const handle = String(formData.get("handle") ?? "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(handle)) {
      return { ok: false, error: "Handle inválido — use só letras, números, ponto e underline." };
    }

    // Feature por plano (o mesmo gate roda de novo na coleta, com kill-switch).
    const { supabase } = await requireTenant();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .in("status", ["active", "trialing"])
      .maybeSingle();
    const { data: plan } = sub
      ? await supabase.from("plans").select("features").eq("id", sub.plan_id).maybeSingle()
      : { data: null };
    const features = (plan?.features ?? {}) as { instagram?: boolean };
    if (features.instagram !== true) {
      return {
        ok: false,
        error: "Fontes de Instagram não estão inclusas no seu plano.",
      };
    }

    return await validateAndInsert({
      name: `@${handle}`,
      type: "instagram",
      url: `https://www.instagram.com/${handle}/`,
      handle,
      tier: 3, // rede social é sinal/contexto — nunca fonte canônica de leitura
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "handle inválido" };
  }
}
