/**
 * Única fonte do naming do produto. "Briefing" é placeholder — quando o nome
 * definitivo for decidido, trocar aqui propaga para UI, metadata, emails e Stripe.
 * String literal com o nome do produto fora deste módulo é bug.
 */
export const BRAND = {
  productName: "Briefing",
  productSlug: "briefing",
  tagline: "Seu briefing diário de tecnologia, curado por IA",
  supportEmail: "suporte@example.com",
  defaultLocale: "pt-BR",
  defaultTimezone: "America/Sao_Paulo",
} as const;

export type Brand = typeof BRAND;
