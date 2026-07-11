import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signup } from "../actions";

/**
 * Passo 1 de 7 do onboarding: criar a conta. Mesmo visual e mesma barra de
 * progresso do wizard (/onboarding), que continua do passo 2 em diante.
 */
const TOTAL_STEPS = 7;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("auth");
  const { error } = await searchParams;

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
        <span className="eyebrow w-max">✓ 7 dias grátis · sem cartão</span>
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
          Crie sua conta.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Primeiro passo do seu briefing diário. Depois daqui você dá um nome a ele, escolhe os
          temas da sua área, monta suas fontes e conecta o WhatsApp. Leva uns 3 minutos, e o teste
          não pede cartão.
        </p>

        {error && <p className="text-sm text-destructive">{t("errorGeneric")}</p>}

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
