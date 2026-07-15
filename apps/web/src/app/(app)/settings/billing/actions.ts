"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@briefing/db/admin";
import { requireTenant } from "@/lib/tenant";
import { getStripe } from "@/lib/stripe";

/**
 * Server actions de billing (Checkout + Customer Portal, ambos hospedados pelo
 * Stripe — sem Stripe.js no client). O estado da assinatura NUNCA é escrito
 * aqui: quem escreve é o webhook (/api/stripe/webhook). Estas actions só
 * redirecionam o owner para o Stripe.
 */

function appBaseUrl(): string {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL não configurada");
  return base.replace(/\/$/, "");
}

async function requireOwner() {
  const ctx = await requireTenant();
  if (ctx.role !== "owner") throw new Error("apenas o dono da conta pode gerenciar o plano");
  return ctx;
}

/**
 * Inicia o Stripe Checkout (mode=subscription) para um plano ativo pago.
 * Se a conta já tem assinatura Stripe vigente, troca de plano é no portal.
 */
export async function createCheckoutSession(formData: FormData): Promise<void> {
  const { supabase, user, accountId } = await requireOwner();
  const planId = String(formData.get("plan_id") ?? "");

  const { data: plan } = await supabase
    .from("plans")
    .select("id, price_cents, stripe_price_id, active")
    .eq("id", planId)
    .maybeSingle();
  if (!plan || !plan.active || plan.price_cents <= 0) throw new Error("plano inválido");
  if (!plan.stripe_price_id) {
    throw new Error(`plano ${plan.id} sem stripe_price_id — rode o UPDATE de price ids deste ambiente`);
  }

  const { data: current } = await supabase
    .from("subscriptions")
    .select("source")
    .in("status", ["active", "trialing"])
    .eq("account_id", accountId)
    .maybeSingle();
  if (current?.source === "stripe") {
    // já assina via Stripe: upgrade/downgrade e cancelamento são no portal
    return createPortalSession();
  }

  const stripe = getStripe();

  // Customer é criado uma vez e vive no account (reutilizado em re-assinaturas).
  // Escrita em accounts é território service-role; o gate aqui é
  // requireTenant() + role owner (análogo ao requirePlatformAdmin do admin).
  const admin = createAdminClient();
  const { data: account } = await admin
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", accountId)
    .maybeSingle();

  let customerId = account?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { account_id: accountId },
    });
    customerId = customer.id;
    const { error } = await admin
      .from("accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", accountId);
    if (error) throw new Error(`persistir customer: ${error.message}`);
  }

  const base = appBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    client_reference_id: accountId,
    subscription_data: { metadata: { account_id: accountId } },
    locale: "pt-BR",
    allow_promotion_codes: true,
    success_url: `${base}/settings?billing=success`,
    cancel_url: `${base}/settings?billing=canceled`,
  });
  if (!session.url) throw new Error("checkout sem URL");
  redirect(session.url);
}

/** Abre o Customer Portal (gerenciar cartão, trocar plano, cancelar). */
export async function createPortalSession(): Promise<void> {
  const { accountId } = await requireOwner();

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", accountId)
    .maybeSingle();
  if (!account?.stripe_customer_id) {
    throw new Error("conta ainda não tem cadastro de cobrança — assine um plano primeiro");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${appBaseUrl()}/settings`,
  });
  redirect(session.url);
}
