"use server";

import {
  decryptCredential,
  encryptCredential,
  ApifyInstagramFetcher,
  getConnector,
  parseInstagramHandle,
  type FetchResult,
  type InstagramFetcher,
  type SourceType,
} from "@briefing/ingestion";
import { ClaudeLlmProvider, parseJson } from "@briefing/curation";
import type { Json } from "@briefing/db/types";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

export interface PreviewItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary?: string | null;
  image?: string | null;
}

export interface AddSourceResult {
  ok: boolean;
  error?: string;
}

/** Resultado da coleta AO VIVO no wizard — nada é persistido ainda. */
export interface ProbeResult {
  ok: boolean;
  status: FetchResult["status"];
  method: FetchResult["method"];
  latencyMs: number;
  error?: string;
  discoveredFeedUrl?: string;
  itemCount: number;
  preview: PreviewItem[];
  /** Índices do preview que batem com os temas do briefing (null = sem análise). */
  relevant: number[] | null;
}

/** O que o wizard confirma no passo final (o server re-resolve tudo). */
export type WizardPayload =
  | { kind: "library"; suggestedId: string }
  | { kind: "site"; url: string; name?: string; tier?: number }
  | { kind: "instagram"; handle: string };

function cleanUrl(raw: string): string {
  const url = new URL(raw.trim());
  return url.toString();
}

/** Provedor do Instagram para validação na adição (mesmo do worker). */
function instagramFetcher(): InstagramFetcher | undefined {
  return process.env.APIFY_TOKEN ? new ApifyInstagramFetcher() : undefined;
}

type SourceInput = {
  name: string;
  type: SourceType;
  url: string;
  feedUrl?: string | null;
  handle?: string | null;
  tier: number;
  credential?: string | null;
  fallbackEligible?: boolean;
};

function failProbe(error: string): ProbeResult {
  return {
    ok: false,
    status: "error",
    method: null,
    latencyMs: 0,
    error,
    itemCount: 0,
    preview: [],
    relevant: null,
  };
}

/** Coleta ao vivo: valida a fonte e busca as últimas 48h, SEM persistir. */
async function probeSource(input: SourceInput): Promise<ProbeResult> {
  const connector = getConnector(input.type, undefined, instagramFetcher());
  const sourceLike = {
    type: input.type,
    url: input.url,
    feed_url: input.feedUrl ?? null,
    handle: input.handle ?? null,
    credential: input.credential ?? null,
  };
  const validation = await connector.validate(sourceLike);

  // Sempre tentamos as últimas 48h; se a janela vier vazia, caímos para os
  // itens da validação (fonte que publica pouco ainda mostra algo).
  let previewItems = validation.items;
  if (validation.status === "ok" || validation.status === "partial") {
    const recent = await connector.collect(sourceLike, { windowHours: 48, maxItems: 8 });
    if (recent.items.length > 0) previewItems = recent.items;
  }
  return {
    ok: validation.status === "ok" || validation.status === "partial",
    status: validation.status,
    method: validation.method,
    latencyMs: validation.latencyMs,
    error: validation.error,
    discoveredFeedUrl: validation.discoveredFeedUrl,
    itemCount: previewItems.length,
    preview: previewItems.slice(0, 8).map((i) => ({
      title: i.title,
      url: i.url,
      publishedAt: i.publishedAt,
      summary: i.summary ? i.summary.replace(/\s+/g, " ").slice(0, 220) : null,
      image: i.image ?? null,
    })),
    relevant: null,
  };
}

/**
 * Passo de validação do wizard: marca quais itens coletados têm a ver com os
 * temas do briefing (judge barato). Enriquecimento — nunca bloqueia o fluxo.
 */
async function classifyRelevance(
  preview: PreviewItem[],
  themes: string[],
): Promise<number[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || themes.length === 0 || preview.length === 0) return null;
  try {
    const llm = new ClaudeLlmProvider();
    const lista = preview
      .map((p, i) => `${i}. ${p.title}${p.summary ? ` — ${p.summary}` : ""}`)
      .join("\n");
    const result = await llm.complete({
      task: "cheap",
      system:
        "Você classifica itens de notícia/posts pela relevância aos temas de interesse de um briefing executivo. Seja criterioso: relevante = trata diretamente de pelo menos um tema. Responda só o JSON.",
      user: `Temas do briefing: ${themes.join(", ")}.\n\nItens coletados:\n${lista}\n\nQuais índices são relevantes?`,
      maxTokens: 2_000,
      jsonSchema: {
        type: "object",
        properties: { relevantes: { type: "array", items: { type: "integer" } } },
        required: ["relevantes"],
        additionalProperties: false,
      },
    });
    const parsed = parseJson<{ relevantes: number[] }>(result.text);
    return parsed.relevantes.filter((i) => Number.isInteger(i) && i >= 0 && i < preview.length);
  } catch {
    return null;
  }
}

async function resolveWizardInput(payload: WizardPayload): Promise<SourceInput> {
  if (payload.kind === "library") {
    const { supabase } = await requireTenant();
    const { data: s } = await supabase
      .from("suggested_sources")
      .select("*")
      .eq("id", payload.suggestedId)
      .single();
    if (!s) throw new Error("fonte sugerida não encontrada");
    return {
      name: s.name,
      type: s.type,
      url: s.url,
      feedUrl: s.feed_url,
      tier: s.suggested_tier,
      fallbackEligible: s.fallback_eligible,
    };
  }
  if (payload.kind === "instagram") {
    const handle = parseInstagramHandle(payload.handle);
    if (!handle) throw new Error("Perfil inválido — cole o link do perfil, @usuario ou o nome do usuário.");
    return {
      name: `@${handle}`,
      type: "instagram",
      url: `https://www.instagram.com/${handle}/`,
      handle,
      tier: 3, // rede social é sinal/contexto — nunca fonte canônica de leitura
    };
  }
  const url = cleanUrl(payload.url);
  const tier = Number(payload.tier ?? 2);
  return {
    name: payload.name?.trim() || new URL(url).hostname.replace(/^www\./, ""),
    type: "rss",
    url,
    tier: [1, 2, 3].includes(tier) ? tier : 2,
  };
}

/** Gate da Fase 5: Instagram só em plano com social (roda de novo na coleta). */
async function assertInstagramAllowed(): Promise<string | null> {
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
  return features.instagram === true ? null : "Fontes de Instagram não estão inclusas no seu plano.";
}

/** Passo de validação do wizard: coleta 48h + relevância aos temas, sem inserir. */
export async function probeWizardSource(payload: WizardPayload): Promise<ProbeResult> {
  try {
    const { profile } = await requireTenant();
    if (payload.kind === "instagram") {
      const blocked = await assertInstagramAllowed();
      if (blocked) return failProbe(blocked);
    }
    const input = await resolveWizardInput(payload);
    const probe = await probeSource(input);
    probe.relevant = await classifyRelevance(probe.preview, profile.themes ?? []);
    return probe;
  } catch (e) {
    return failProbe(e instanceof Error ? e.message : "entrada inválida");
  }
}

/** Confirmação do wizard: o usuário viu a coleta e deu ok — persiste sem refetch. */
export async function confirmWizardSource(
  payload: WizardPayload,
  probe: ProbeResult,
): Promise<AddSourceResult> {
  try {
    if (payload.kind === "instagram") {
      const blocked = await assertInstagramAllowed();
      if (blocked) return { ok: false, error: blocked };
    }
    const input = await resolveWizardInput(payload);
    const { supabase, accountId, profile } = await requireTenant();
    const now = new Date().toISOString();
    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        account_id: accountId,
        profile_id: profile.id,
        name: input.name,
        type: input.type,
        url: input.url,
        feed_url: probe.discoveredFeedUrl ?? input.feedUrl ?? null,
        handle: input.handle ?? null,
        tier: input.tier,
        fallback_eligible: input.fallbackEligible ?? true,
        credential_enc: input.credential ? await encryptCredential(input.credential) : null,
        last_status: probe.status,
        last_error: probe.error ?? null,
        last_checked_at: now,
        last_ok_at: probe.status === "ok" ? now : null,
        last_preview: probe.preview as unknown as Json,
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
      status: probe.status,
      method: probe.method,
      latency_ms: probe.latencyMs,
      items_found: probe.itemCount,
      error: probe.error ?? null,
    });

    revalidatePath("/sources");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "entrada inválida" };
  }
}

export async function revalidateSource(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const { supabase, accountId } = await requireTenant();

  const { data: source } = await supabase.from("sources").select("*").eq("id", id).single();
  if (!source) return;

  const connector = getConnector(source.type, undefined, instagramFetcher());
  const sourceLike = {
    type: source.type,
    url: source.url,
    feed_url: source.feed_url,
    handle: source.handle,
    // Credencial só existe decifrada aqui, no server, durante o fetch.
    credential: source.credential_enc ? await decryptCredential(source.credential_enc) : null,
  };
  const validation = await connector.validate(sourceLike);

  let previewItems = validation.items;
  if (validation.status === "ok" || validation.status === "partial") {
    const recent = await connector.collect(sourceLike, { windowHours: 48, maxItems: 8 });
    if (recent.items.length > 0) previewItems = recent.items;
  }

  const now = new Date().toISOString();
  await supabase
    .from("sources")
    .update({
      feed_url: validation.discoveredFeedUrl ?? source.feed_url,
      last_status: validation.status,
      last_error: validation.error ?? null,
      last_checked_at: now,
      last_ok_at: validation.status === "ok" ? now : source.last_ok_at,
      last_preview: previewItems.slice(0, 8).map((i) => ({
        title: i.title,
        url: i.url,
        publishedAt: i.publishedAt,
        summary: i.summary ? i.summary.replace(/\s+/g, " ").slice(0, 220) : null,
        image: i.image ?? null,
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
