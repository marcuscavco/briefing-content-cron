"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@briefing/db/server";
import { createAdminClient, requirePlatformAdmin } from "@briefing/db/admin";

/**
 * Server actions do backoffice. TODAS começam com o mesmo gate:
 * getUser() → requirePlatformAdmin(user.id) → admin client (service role).
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("não autenticado");
  await requirePlatformAdmin(user.id);
  return { admin: createAdminClient(), userId: user.id };
}

/** Concede um plano a uma account (source = admin_grant). Cancela a vigente antes. */
export async function grantSubscription(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const accountId = String(formData.get("account_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!accountId || !planId) throw new Error("account_id e plan_id são obrigatórios");

  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .in("status", ["active", "trialing"]);

  const { error } = await admin.from("subscriptions").insert({
    account_id: accountId,
    plan_id: planId,
    source: "admin_grant",
    granted_by: userId,
    notes,
  });
  if (error) throw new Error(`concessão falhou: ${error.message}`);
  revalidatePath("/admin");
}

/** Revoga (cancela) a assinatura vigente de uma account. */
export async function revokeSubscription(formData: FormData) {
  const { admin } = await requireAdmin();
  const accountId = String(formData.get("account_id") ?? "");
  if (!accountId) throw new Error("account_id é obrigatório");

  const { error } = await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .in("status", ["active", "trialing"]);
  if (error) throw new Error(`revogação falhou: ${error.message}`);
  revalidatePath("/admin");
}

/** Catálogo global: adicionar fonte sugerida. */
export async function addSuggestedSource(formData: FormData) {
  const { admin } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const feedUrl = String(formData.get("feed_url") ?? "").trim() || null;
  const tier = Number(formData.get("suggested_tier") ?? 3);
  const category = String(formData.get("category") ?? "tecnologia");
  const country = String(formData.get("country") ?? "BR");
  if (!name || !url) throw new Error("nome e URL são obrigatórios");

  const { error } = await admin.from("suggested_sources").insert({
    name,
    url,
    feed_url: feedUrl,
    suggested_tier: tier,
    category,
    country,
    language: country === "BR" ? "pt-BR" : "en",
  });
  if (error) throw new Error(`inclusão falhou: ${error.message}`);
  revalidatePath("/admin/catalog");
}

/** Catálogo global: ativar/pausar fonte sugerida. */
export async function toggleSuggestedSource(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  const { error } = await admin.from("suggested_sources").update({ active }).eq("id", id);
  if (error) throw new Error(`atualização falhou: ${error.message}`);
  revalidatePath("/admin/catalog");
}

/** Catálogo global: remover fonte sugerida. */
export async function removeSuggestedSource(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const { error } = await admin.from("suggested_sources").delete().eq("id", id);
  if (error) throw new Error(`remoção falhou: ${error.message}`);
  revalidatePath("/admin/catalog");
}

/** Kill-switch global do Instagram (Fase 5): desliga a coleta para TODAS as contas. */
export async function setInstagramKillSwitch(formData: FormData) {
  const { admin } = await requireAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const { error } = await admin
    .from("app_config")
    .upsert({ key: "instagram_connector_enabled", value: enabled, updated_at: new Date().toISOString() });
  if (error) throw new Error(`kill-switch falhou: ${error.message}`);
  revalidatePath("/admin");
}
