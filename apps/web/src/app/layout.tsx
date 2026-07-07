import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { BRAND } from "@briefing/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: BRAND.productName,
    template: `%s · ${BRAND.productName}`,
  },
  description: BRAND.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
