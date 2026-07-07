import { createClient } from "@briefing/db/server";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS garante que só as memberships/accounts do próprio usuário voltam.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role, account_id")
    .limit(1)
    .maybeSingle();

  const { data: account } = membership
    ? await supabase
        .from("accounts")
        .select("id, name")
        .eq("id", membership.account_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome")}, {user?.user_metadata?.full_name || user?.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{account?.name ?? "—"}</CardTitle>
          <CardDescription>
            {t("accountLabel")} · {t("roleLabel")}: {membership?.role ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("placeholder")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
