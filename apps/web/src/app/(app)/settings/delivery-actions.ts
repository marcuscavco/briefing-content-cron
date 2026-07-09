"use server";

import { createAdminClient } from "@briefing/db/admin";
import { ZapiClient } from "@briefing/delivery";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

/**
 * Double opt-in de destino WhatsApp (brief §8), agora no formato wizard:
 * número (só pessoal, BR) → código enviado → confirmação no mesmo fluxo.
 * O phone é LITERAL para a Z-API (55+DDD+número). Campos de verificação só
 * mudam via service role — trigger no banco impede auto-verificação.
 * Grupos não são mais aceitos pela UI (legado continua suportado no banco).
 */

export interface WizardDestinationResult {
  ok: boolean;
  destinationId?: string;
  error?: string;
}

async function sendCodeById(id: string, profileId: string): Promise<WizardDestinationResult> {
  const admin = createAdminClient();
  const { data: dest } = await admin
    .from("whatsapp_destinations")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profileId) // garante que o destino é do tenant
    .single();
  if (!dest) return { ok: false, error: "Destino não encontrado." };
  if (dest.verified) return { ok: true, destinationId: id };

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

  return { ok: true, destinationId: id };
}

/**
 * Passo "número" do wizard: valida (BR, só pessoal — sem grupos), insere (ou
 * reaproveita um pendente com o mesmo número) e já dispara o código.
 */
export async function addDestinationAndSendCode(
  nationalDigits: string,
  label?: string,
): Promise<WizardDestinationResult> {
  const clean = nationalDigits.replace(/\D/g, "");
  if (!/^\d{10,11}$/.test(clean)) {
    return { ok: false, error: "Número inválido — informe DDD + número, ex.: (85) 99999-0000." };
  }
  const phone = `55${clean}`; // LITERAL — nunca normalizar depois daqui

  const { supabase, accountId, profile } = await requireTenant();

  const { data: existing } = await supabase
    .from("whatsapp_destinations")
    .select("id, verified")
    .eq("profile_id", profile.id)
    .eq("phone", phone)
    .maybeSingle();
  if (existing?.verified) {
    return { ok: false, error: "Esse número já está verificado neste briefing." };
  }

  let id = existing?.id;
  if (!id) {
    const { data, error } = await supabase
      .from("whatsapp_destinations")
      .insert({
        account_id: accountId,
        profile_id: profile.id,
        kind: "personal",
        phone,
        label: label?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    id = data.id;
  }

  const sent = await sendCodeById(id, profile.id);
  revalidatePath("/settings");
  return sent.ok ? { ok: true, destinationId: id } : { ...sent, destinationId: id };
}

/** Reenvio (ou retomada de verificação de um destino pendente). */
export async function resendCode(destinationId: string): Promise<WizardDestinationResult> {
  const { profile } = await requireTenant();
  const result = await sendCodeById(destinationId, profile.id);
  revalidatePath("/settings");
  return result;
}

/** Passo "código" do wizard: confere o código de 6 dígitos e verifica o destino. */
export async function confirmCode(
  destinationId: string,
  code: string,
): Promise<WizardDestinationResult> {
  const { profile } = await requireTenant();
  const admin = createAdminClient();

  const { data: dest } = await admin
    .from("whatsapp_destinations")
    .select("*")
    .eq("id", destinationId)
    .eq("profile_id", profile.id)
    .single();
  if (!dest) return { ok: false, error: "Destino não encontrado." };
  if (dest.verified) return { ok: true, destinationId };
  if (!dest.verification_code || !dest.verification_expires_at) {
    return { ok: false, error: "Peça um código primeiro." };
  }
  if (new Date(dest.verification_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Código expirado. Peça um novo." };
  }
  if (dest.verification_attempts >= 5) {
    return { ok: false, error: "Muitas tentativas. Peça um código novo." };
  }

  if (code.trim() !== dest.verification_code) {
    await admin
      .from("whatsapp_destinations")
      .update({ verification_attempts: dest.verification_attempts + 1 })
      .eq("id", destinationId);
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
    .eq("id", destinationId);

  revalidatePath("/settings");
  return { ok: true, destinationId };
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
