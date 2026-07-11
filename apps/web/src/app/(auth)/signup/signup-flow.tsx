"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signup } from "../actions";

/**
 * Início do onboarding: boas-vindas enxutas → conta (passo 1 de 7).
 * O wizard de /onboarding continua do passo 2 depois da confirmação.
 */
const TOTAL_STEPS = 7;

export function SignupFlow({ hasError }: { hasError: boolean }) {
  const t = useTranslations("auth");
  // Se voltou com erro do server action, cai direto no formulário.
  const [step, setStep] = useState<"welcome" | "account">(hasError ? "account" : "welcome");

  if (step === "welcome") {
    return (
      <section className="rise flex flex-col gap-8">
        <span className="eyebrow w-max">✓ 7 dias grátis · sem cartão</span>
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
          Seu briefing diário começa agora.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Todo dia às 7h, o essencial da sua área chega no seu WhatsApp. Em uns 3 minutos você
          monta o seu: temas, fontes e número verificado.
        </p>
        <Button size="lg" className="w-full sm:w-fit sm:px-12" onClick={() => setStep("account")}>
          Iniciar meu briefing →
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="underline underline-offset-4">
            {t("signIn")}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="rise flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>passo 1 de {TOTAL_STEPS}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-6 rounded-full transition-colors duration-500",
                i < 1 ? "bg-emerald-400/70" : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>

      <section className="rise flex flex-col gap-8">
        <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-tight md:text-5xl">
          Crie sua conta.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Nome, email e senha. O resto a gente monta junto nos próximos passos.
        </p>

        {hasError && <p className="text-sm text-destructive">{t("errorGeneric")}</p>}

        <form className="flex w-full max-w-md flex-col gap-4" action={signup}>
          <div className="grid gap-2">
            <Label htmlFor="full_name">{t("fullName")}</Label>
            <Input id="full_name" name="full_name" type="text" autoComplete="name" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" size="lg" className="mt-2 w-full sm:w-fit sm:px-12">
            Criar conta e continuar →
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="underline underline-offset-4">
            {t("signIn")}
          </Link>
        </p>
      </section>
    </div>
  );
}
