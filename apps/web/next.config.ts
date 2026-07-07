import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Packages do workspace são publicados como TS puro; o Next transpila.
  transpilePackages: ["@briefing/config", "@briefing/db", "@briefing/ingestion"],
};

export default withNextIntl(nextConfig);
