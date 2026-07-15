import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Cliente Stripe singleton (server-only). A apiVersion é a pinada pelo SDK
 * instalado — upgrades de versão da API acontecem junto com o bump do pacote.
 */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    client = new Stripe(key);
  }
  return client;
}
