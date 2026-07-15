import { NextResponse } from "next/server";
import { createAdminClient } from "@briefing/db/admin";
import { getStripe } from "@/lib/stripe";
import { syncStripeSubscription } from "@/lib/billing-sync";

/**
 * Webhook do Stripe — único escritor de assinaturas source='stripe'.
 * Endpoint registrado no dashboard com exatamente estes eventos:
 *   checkout.session.completed
 *   customer.subscription.created / updated / deleted
 *   invoice.payment_failed
 *
 * Idempotência via stripe_events (entrega é at-least-once); em erro
 * transitório o registro do evento é desfeito e devolvemos 500 para o
 * Stripe re-tentar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "webhook não configurado" }, { status: 400 });
  }

  // Request.text() preserva o corpo cru — obrigatório para verificar assinatura.
  const body = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: dedupeError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dedupeError) {
    if (dedupeError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: dedupeError.message }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const accountId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (accountId && customerId) {
          const { error } = await admin
            .from("accounts")
            .update({ stripe_customer_id: customerId })
            .eq("id", accountId);
          if (error) throw new Error(`accounts update: ${error.message}`);
        }
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId) await syncStripeSubscription(subscriptionId);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object.id);
        break;
      case "invoice.payment_failed":
        // Estado (past_due) chega via customer.subscription.updated; aqui só
        // registramos para diagnóstico. Dunning é do Smart Retries do Stripe.
        console.error(`stripe: pagamento falhou para invoice ${event.data.object.id}`);
        break;
      default:
        break; // evento não assinado no endpoint; aceitar sem processar
    }
  } catch (e) {
    // desfaz a marca de idempotência para o retry do Stripe não virar no-op
    await admin.from("stripe_events").delete().eq("id", event.id);
    const message = e instanceof Error ? e.message : "erro desconhecido";
    console.error(`stripe webhook ${event.type} (${event.id}): ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
