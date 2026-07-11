import { getRequestConfig } from "next-intl/server";
import { BRAND } from "@briefing/config/brand";

/**
 * Locale fixo em pt-BR no v1 (i18n-ready: adicionar roteamento de locale aqui
 * quando houver segundo idioma; as strings já vivem em messages/<locale>.json).
 */
export default getRequestConfig(async () => {
  const locale = BRAND.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
