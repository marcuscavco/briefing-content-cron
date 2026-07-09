import {
  renderBriefingEmail,
  renderWhatsappMessages,
  unsubscribeToken,
  type DeliveryCluster,
  type DeliveryPost,
  type EmailSender,
  type WhatsappSender,
} from "@briefing/delivery";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineCheckpoint, ProfileConfig } from "./types";

/**
 * Etapa 8 do SKILL.md — distribuição, multi-tenant:
 * - email para o owner da account (Resend);
 * - WhatsApp para CADA destino do profile: verificado+ativo recebe msg1 → ~1s →
 *   msg2 (regra do legado); NÃO VERIFICADO É RECUSADO (skipped_unverified —
 *   aceite da fase); falha em um destino não derruba os outros.
 * - Idempotente: delivery_log(status=sent) por (briefing, canal, destino).
 */

export interface DeliverDeps {
  db: SupabaseClient;
  email?: EmailSender;
  whatsapp?: WhatsappSender;
  appBaseUrl?: string;
  unsubscribeSecret?: string;
  sleepMs?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function deliverBriefing(
  deps: DeliverDeps,
  profile: ProfileConfig,
  checkpoint: PipelineCheckpoint,
): Promise<string> {
  const briefingId = checkpoint.briefingId;
  if (!briefingId) return "sem briefing para entregar";
  const { db } = deps;
  const wait = deps.sleepMs ?? sleep;

  const { data: briefing } = await db.from("briefings").select("*").eq("id", briefingId).single();
  if (!briefing) return "briefing não encontrado";

  const { data: clusterRows } = await db
    .from("clusters")
    .select("*")
    .eq("briefing_id", briefingId)
    .in("categoria", ["must_read", "relevante", "no_radar", "sinal_sem_fonte"])
    .order("ordem");
  const clusters = (clusterRows ?? []) as unknown as (DeliveryCluster & { id: string })[];

  const { data: postRows } = await db
    .from("posts")
    .select("*")
    .eq("briefing_id", briefingId)
    .order("ordem");
  const tituloByCluster = new Map(clusters.map((c) => [c.id, c.titulo]));
  const posts: DeliveryPost[] = (postRows ?? []).map((p) => ({
    titulo: p.cluster_id ? (tituloByCluster.get(p.cluster_id) ?? null) : null,
    formato: p.formato,
    gancho: p.gancho,
    estrutura: p.estrutura as DeliveryPost["estrutura"],
    angulo_tipo: p.angulo_tipo,
    angulo_descricao: p.angulo_descricao,
    cta: p.cta,
    skip: p.skip,
    skip_motivo: p.skip_motivo,
  }));

  const channels = (profile.channels ?? {}) as { email?: boolean; whatsapp?: boolean };
  const report: string[] = [];

  const alreadySent = async (channel: string, destination: string) => {
    const { data } = await db
      .from("delivery_log")
      .select("id")
      .eq("briefing_id", briefingId)
      .eq("channel", channel)
      .eq("destination", destination)
      .eq("status", "sent")
      .maybeSingle();
    return Boolean(data);
  };

  const log = async (
    channel: string,
    destination: string,
    status: string,
    providerResponse?: unknown,
    error?: string,
  ) => {
    await db.from("delivery_log").insert({
      account_id: profile.accountId,
      briefing_id: briefingId,
      channel,
      destination,
      status,
      provider_response: providerResponse ?? null,
      error: error ?? null,
    });
  };

  // ── Email ──────────────────────────────────────────────────────────────────
  const entrega: Record<string, unknown> = {};
  if (channels.email) {
    const ownerEmail = await ownerEmailOf(db, profile.accountId);
    if (!ownerEmail) {
      report.push("email: owner sem email");
    } else if (await alreadySent("email", ownerEmail)) {
      report.push("email: já enviado (idempotência)");
      entrega.email = "sent";
    } else if (!deps.email) {
      await log("email", ownerEmail, "skipped_disabled", null, "RESEND_API_KEY ausente");
      report.push("email: desabilitado (sem provider)");
      entrega.email = "skipped_disabled";
    } else {
      const base = deps.appBaseUrl ?? "https://briefing-saas-weld.vercel.app";
      const unsub = deps.unsubscribeSecret
        ? `${base}/api/unsubscribe?token=${unsubscribeToken(profile.id, deps.unsubscribeSecret)}`
        : `${base}/settings`;
      const { subject, html } = await renderBriefingEmail({
        briefing,
        clusters,
        posts,
        dashboardUrl: `${base}/dashboard`,
        unsubscribeUrl: unsub,
      });
      try {
        const result = await deps.email.send(ownerEmail, subject, html);
        await log("email", ownerEmail, result.ok ? "sent" : "failed", result.response);
        report.push(`email: ${result.ok ? "enviado" : "FALHOU"} (${ownerEmail})`);
        entrega.email = result.ok ? "sent" : "failed";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await log("email", ownerEmail, "failed", null, msg);
        report.push(`email: FALHOU (${msg})`);
        entrega.email = "failed";
      }
    }
  } else {
    report.push("email: canal desligado");
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const whatsappDestinos: Record<string, string> = {};
  if (channels.whatsapp) {
    // Até 3 mensagens por categoria: must-read · outros assuntos · posts.
    const briefingUrl = deps.appBaseUrl ? `${deps.appBaseUrl.replace(/\/$/, "")}/b/${briefingId}` : undefined;
    const messages = renderWhatsappMessages(briefing, clusters, posts, { briefingUrl });
    await db
      .from("briefings")
      .update({
        whatsapp_msg_1: messages[0] ?? null,
        whatsapp_msg_2: messages[1] ?? null,
        whatsapp_msg_3: messages[2] ?? null,
      })
      .eq("id", briefingId);

    const { data: destinations } = await db
      .from("whatsapp_destinations")
      .select("*")
      .eq("profile_id", profile.id);

    for (const dest of destinations ?? []) {
      // ACEITE DA FASE: destino não verificado é recusado.
      if (!dest.verified) {
        await log("whatsapp", dest.phone, "skipped_unverified", null, "destino não verificado");
        whatsappDestinos[dest.phone] = "skipped_unverified";
        continue;
      }
      if (!dest.active) continue;
      if (await alreadySent("whatsapp", dest.phone)) {
        whatsappDestinos[dest.phone] = "sent";
        continue;
      }
      if (!deps.whatsapp) {
        await log("whatsapp", dest.phone, "skipped_disabled", null, "Z-API não configurada");
        whatsappDestinos[dest.phone] = "skipped_disabled";
        continue;
      }
      try {
        // Envio LITERAL do phone (match exato — nunca normalizar).
        const responses: unknown[] = [];
        let ok = true;
        for (const [i, message] of messages.entries()) {
          if (i > 0) await wait(1000);
          const r = await deps.whatsapp.sendText(dest.phone, message);
          responses.push(r.response);
          ok = ok && r.ok;
        }
        await log("whatsapp", dest.phone, ok ? "sent" : "failed", { messages: responses });
        whatsappDestinos[dest.phone] = ok ? "sent" : "failed";
      } catch (e) {
        // Falha em um destino não derruba os outros (regra do PROMPT.md legado).
        const msg = e instanceof Error ? e.message : String(e);
        await log("whatsapp", dest.phone, "failed", null, msg);
        whatsappDestinos[dest.phone] = "failed";
      }
    }
    report.push(
      `whatsapp: ${Object.entries(whatsappDestinos).map(([p, s]) => `${p}=${s}`).join(", ") || "sem destinos"}`,
    );
    entrega.whatsapp_destinos = whatsappDestinos;
  } else {
    report.push("whatsapp: canal desligado");
  }

  // Relatório (etapa 9) — como o legado gravava em briefings.notas
  const { data: current } = await db.from("briefings").select("notas").eq("id", briefingId).single();
  await db
    .from("briefings")
    .update({ notas: { ...((current?.notas as object) ?? {}), entrega } })
    .eq("id", briefingId);

  return report.join(" · ");
}

async function ownerEmailOf(db: SupabaseClient, accountId: string): Promise<string | null> {
  const { data: owner } = await db
    .from("memberships")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (!owner) return null;
  const { data, error } = await db.auth.admin.getUserById(owner.user_id);
  if (error) return null;
  return data.user?.email ?? null;
}
