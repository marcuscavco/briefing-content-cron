"use server";

import { createAdminClient } from "@briefing/db/admin";
import { ZapiClient } from "@briefing/delivery";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

/**
 * Double opt-in de destino WhatsApp (brief §8). O phone é LITERAL (match exato,
 * grupos com sufixo -group). Campos de verificação só mudam via service role —
 * trigger no banco impede o cliente de se auto-verificar.
 */

export interface VerificationResult {
  ok: boolean;
  error?: string;
  verified?: boolean;
}

const PHONE_RE = /^[0-9]+(-group)?$/;

export async function addWhatsappDestination(
  _prev: VerificationResult | null,
  formData: FormData,
): Promise<VerificationResult> {
  const { supabase, accountId, profile } = await requireTenant();
  const phone = String(formData.get("phone") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!PHONE_RE.test(phone)) {
    return { ok: false, error: "Formato inválido. Use só dígitos (ex.: 5585999990000) ou JID de grupo com sufixo -group." };
  }

  const { error } = await supabase.from("whatsapp_destinations").insert({
    account_id: accountId,
    profile_id: profile.id,
    kind: phone.endsWith("-group") ? "group" : "personal",
    phone, // LITERAL — nunca normalizar
    label,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Esse destino já existe." : error.message };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function sendVerificationCode(
  _prev: VerificationResult | null,
  formData: FormData,
): Promise<VerificationResult> {
  const { profile } = await requireTenant(); // valida sessão/tenant
  const id = String(formData.get("id"));
  const admin = createAdminClient();

  const { data: dest } = await admin
    .from("whatsapp_destinations")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile.id) // garante que o destino é do tenant
    .single();
  if (!dest) return { ok: false, error: "Destino não encontrado." };
  if (dest.verified) return { ok: true, verified: true };

  // Rate limit: máx 3 códigos por hora
  const windowStart = dest.verification_window ? new Date(dest.verification_window) : null;
  const inWindow = windowStart && Date.now() - windowStart.getTime() < 3600_000;
  const sends = inWindow ? dest.verification_sends : 0;
  if (sends >= 3) {
    return { ok: false, error: "Limite de códigos atingido. Tente de novo em 1 hora." };
  }

  if (!process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN) {
    return { ok: false, error: "WhatsApp ainda não configurado na plataforma (Z-API pendente)." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const zapi = new ZapiClient();
  const result = await zapi.sendText(
    dest.phone, // LITERAL
    `Seu código de verificação: *${code}*\n\nEle confirma este destino para receber o briefing diário. Expira em 15 minutos.`,
  );
  if (!result.ok) {
    return { ok: false, error: `Falha ao enviar o código: ${JSON.stringify(result.response).slice(0, 150)}` };
  }

  await admin
    .from("whatsapp_destinations")
    .update({
      verification_code: code,
      verification_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      verification_attempts: 0,
      verification_sends: sends + 1,
      verification_window: inWindow ? dest.verification_window : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/settings");
  return { ok: true };
}

export async function confirmVerification(
  _prev: VerificationResult | null,
  formData: FormData,
): Promise<VerificationResult> {
  const { profile } = await requireTenant();
  const id = String(formData.get("id"));
  const code = String(formData.get("code") ?? "").trim();
  const admin = createAdminClient();

  const { data: dest } = await admin
    .from("whatsapp_destinations")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single();
  if (!dest) return { ok: false, error: "Destino não encontrado." };
  if (dest.verified) return { ok: true, verified: true };
  if (!dest.verification_code || !dest.verification_expires_at) {
    return { ok: false, error: "Peça um código primeiro." };
  }
  if (new Date(dest.verification_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Código expirado. Peça um novo." };
  }
  if (dest.verification_attempts >= 5) {
    return { ok: false, error: "Muitas tentativas. Peça um código novo." };
  }

  if (code !== dest.verification_code) {
    await admin
      .from("whatsapp_destinations")
      .update({ verification_attempts: dest.verification_attempts + 1 })
      .eq("id", id);
    return { ok: false, error: "Código incorreto." };
  }

  await admin
    .from("whatsapp_destinations")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      verification_code: null,
      verification_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/settings");
  return { ok: true, verified: true };
}

export async function removeDestination(formData: FormData): Promise<void> {
  const { supabase } = await requireTenant();
  await supabase.from("whatsapp_destinations").delete().eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}

export async function toggleDestination(formData: FormData): Promise<void> {
  const { supabase } = await requireTenant();
  await supabase
    .from("whatsapp_destinations")
    .update({ active: String(formData.get("active")) === "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}
