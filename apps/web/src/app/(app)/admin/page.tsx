import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createAdminClient } from "@briefing/db/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { grantSubscription, revokeSubscription, setInstagramKillSwitch } from "./actions";

/** Backoffice: contas + assinaturas (admin_grant). Gate no layout. */
export default async function AdminPage() {
  const t = await getTranslations("admin");
  const admin = createAdminClient();

  const [{ data: accounts }, { data: plans }, { data: subs }, { data: memberships }, { data: igCfg }] =
    await Promise.all([
      admin.from("accounts").select("id, name, created_at").order("created_at"),
      admin.from("plans").select("id, name").eq("active", true).order("sort_order"),
      admin
        .from("subscriptions")
        .select("account_id, plan_id, status, source, current_period_end")
        .in("status", ["active", "trialing"]),
      admin.from("memberships").select("account_id, user_id, role").eq("role", "owner"),
      admin.from("app_config").select("value").eq("key", "instagram_connector_enabled").maybeSingle(),
    ]);
  const instagramOn = igCfg?.value !== false;

  // Email dos owners (admin API; volume v1 é pequeno)
  const ownerEmail = new Map<string, string>();
  for (const m of memberships ?? []) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    if (data.user?.email) ownerEmail.set(m.account_id, data.user.email);
  }
  const subOf = new Map((subs ?? []).map((s) => [s.account_id, s]));

  return (
    <div className="rise flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/admin/catalog" className="text-sm underline underline-offset-2">
          {t("catalogLink")}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("instagramSwitch")}</CardTitle>
          <CardDescription>
            {instagramOn ? t("instagramSwitchOn") : t("instagramSwitchOff")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setInstagramKillSwitch}>
            <input type="hidden" name="enabled" value={String(!instagramOn)} />
            <Button type="submit" size="sm" variant={instagramOn ? "destructive" : "default"}>
              {instagramOn ? t("instagramTurnOff") : t("instagramTurnOn")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("accounts")}</CardTitle>
          <CardDescription>{t("accountsSubtitle", { count: (accounts ?? []).length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {(accounts ?? []).map((a) => {
              const sub = subOf.get(a.id);
              return (
                <li key={a.id} className="flex flex-col gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ownerEmail.get(a.id) ?? "—"} ·{" "}
                        {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-sm">
                      {sub ? (
                        <span>
                          ✅ {sub.plan_id}
                          <span className="text-muted-foreground">
                            {" "}
                            ({sub.source === "admin_grant" ? t("grantedByAdmin") : "stripe"})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t("noSubscription")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={grantSubscription} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="account_id" value={a.id} />
                      <select
                        name="plan_id"
                        className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm"
                        defaultValue={sub?.plan_id ?? plans?.[0]?.id}
                      >
                        {(plans ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        name="notes"
                        placeholder={t("grantNotes")}
                        className="h-9 w-48 text-sm"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        {t("grant")}
                      </Button>
                    </form>
                    {sub && (
                      <form action={revokeSubscription}>
                        <input type="hidden" name="account_id" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          {t("revoke")}
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
