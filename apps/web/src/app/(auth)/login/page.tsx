import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@briefing/config/brand";
import { login, sendMagicLink, signInWithGoogle } from "../actions";

const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "errorInvalidCredentials",
  auth_callback: "errorAuthCallback",
  invalid_link: "errorInvalidLink",
  generic: "errorGeneric",
};

const NOTICE_KEYS: Record<string, string> = {
  magic_link_sent: "magicLinkSent",
  signup_success: "signupSuccess",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const t = await getTranslations("auth");
  const { error, notice, next } = await searchParams;
  const errorKey = error ? (ERROR_KEYS[error] ?? "errorGeneric") : null;
  const noticeKey = notice ? NOTICE_KEYS[notice] : null;

  return (
    <div className="rise mx-auto flex w-full max-w-md flex-col gap-6">
      <span className="font-display text-lg font-semibold tracking-tight">{BRAND.productName}</span>
      <Card>
      <CardHeader>
        <CardTitle>{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {errorKey && <p className="text-sm text-destructive">{t(errorKey)}</p>}
        {noticeKey && <p className="text-sm text-muted-foreground">{t(noticeKey)}</p>}

        <form className="flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}
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
              autoComplete="current-password"
            />
          </div>
          <Button formAction={login} className="w-full">
            {t("signIn")}
          </Button>
          <Button formAction={sendMagicLink} variant="outline" className="w-full">
            {t("sendMagicLink")}
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {t("or")}
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={signInWithGoogle}>
          <Button type="submit" variant="outline" className="w-full">
            {t("continueWithGoogle")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/onboarding" className="underline underline-offset-4">
            {t("signUp")}
          </Link>
        </p>
      </CardContent>
      </Card>
    </div>
  );
}
