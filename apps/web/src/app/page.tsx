import { createClient } from "@briefing/db/server";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Lp } from "@/components/landing/lp";
import "./landing.css";

const clash = localFont({
  src: [
    { path: "./fonts/clash-display-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/clash-display-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-clash",
  display: "swap",
});

const jakarta = localFont({
  src: [{ path: "./fonts/plus-jakarta-var.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Briefing Nerd | o essencial da sua área no WhatsApp, todo dia às 7h",
  description:
    "O Briefing Nerd lê de madrugada as fontes da sua área (negócios, jurídico, política, economia, tecnologia, o que você escolher) e entrega no seu WhatsApp, todo dia às 7h, um resumo de 2 minutos só com o que importa. 7 dias grátis, sem cartão.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loggedIn = Boolean(user);

  return (
    <div className={`${clash.variable} ${jakarta.variable}`}>
      <Lp
        loggedIn={loggedIn}
        primaryHref={loggedIn ? "/dashboard" : "/onboarding"}
        primaryLabel={loggedIn ? "Abrir meu painel" : "Começar 7 dias grátis"}
      />
    </div>
  );
}
