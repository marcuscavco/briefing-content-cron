import "server-only";
import { createAdminClient } from "@briefing/db/admin";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Sincroniza UMA assinatura do Stripe com a tabela subscriptions. Chamado pelo
 * webhook; sempre re-busca a assinatura na API em vez de confiar no payload do
 * evento — entrega fora de ordem vira no-op, sem bookkeeping de sequência.
 *
 * O webhook é o ÚNICO escritor de linhas source='stripe'. Precedência: quando
 * uma assinatura Stripe entra em vigor, qualquer vigente (ex.: admin_grant) é
 * cancelada antes — o índice subscriptions_active_uniq exige essa ordem.
 */
export async function syncStripeSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  let accountId = sub.metadata?.account_id || null;
  if (!accountId) {
    const { data } = await admin
      .from("accounts")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    accountId = data?.id ?? null;
  }
  if (!accountId) {
    // bug de configuração, não transitório: 200 (sem retry) + log
    console.error(`stripe sync: assinatura ${sub.id} sem account_id resolvível`);
    return;
  }

  const item = sub.items.data[0];
  const { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("stripe_price_id", item?.price.id ?? "")
    .maybeSingle();
  if (!plan) {
    console.error(`stripe sync: price ${item?.price.id} sem plano correspondente em plans`);
    return;
  }

  const status = mapStatus(sub.status);
  if (!status) return; // incomplete: pagamento inicial pendente, nada a registrar

  const nowIso = new Date().toISOString();
  const periodStart = item ? epochToIso(item.current_period_start) : nowIso;
  const periodEnd = item ? epochToIso(item.current_period_end) : null;
  // cancelamento agendado no portal aparece como canceled_at futuro
  const canceledAt =
    status === "canceled"
      ? sub.canceled_at
        ? epochToIso(sub.canceled_at)
        : nowIso
      : sub.cancel_at_period_end
        ? periodEnd
        : null;

  const row = {
    plan_id: plan.id,
    status,
    stripe_customer_id: customerId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    canceled_at: canceledAt,
    updated_at: nowIso,
  };

  const { data: existing, error: lookupError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (lookupError) throw new Error(`subscriptions lookup: ${lookupError.message}`);

  if (existing) {
    const { error } = await admin.from("subscriptions").update(row).eq("id", existing.id);
    if (error) throw new Error(`subscriptions update: ${error.message}`);
    return;
  }

  if (status === "canceled") return; // nunca vimos e já morreu: não criar histórico órfão

  const { error: supersedeError } = await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: nowIso, notes: "substituída por assinatura Stripe", updated_at: nowIso })
    .eq("account_id", accountId)
    .in("status", ["active", "trialing"]);
  if (supersedeError) throw new Error(`supersede: ${supersedeError.message}`);

  const { error: insertError } = await admin.from("subscriptions").insert({
    ...row,
    account_id: accountId,
    source: "stripe",
    stripe_subscription_id: sub.id,
  });
  if (insertError) throw new Error(`subscriptions insert: ${insertError.message}`);
}

/** Stripe → enum subscription_status. null = ignorar o evento. */
function mapStatus(status: Stripe.Subscription.Status): "active" | "trialing" | "past_due" | "canceled" | null {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    case "incomplete":
      return null;
  }
}

function epochToIso(epoch: number): string {
  return new Date(epoch * 1000).toISOString();
}
