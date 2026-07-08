import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BriefingView } from "@/components/briefing/briefing-view";
import { requireTenant } from "@/lib/tenant";
import { GenerateButton } from "./generate-button";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const { supabase, user, profile } = await requireTenant();

  const { data: briefing } = await supabase
    .from("briefings")
    .select("*")
    .eq("profile_id", profile.id)
    .order("run_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: clusters } = briefing
    ? await supabase
        .from("clusters")
        .select("*")
        .eq("briefing_id", briefing.id)
        .in("categoria", ["must_read", "relevante", "no_radar", "sinal_sem_fonte"])
        .order("ordem")
    : { data: null };

  const { data: posts } = briefing
    ? await supabase.from("posts").select("*").eq("briefing_id", briefing.id).order("ordem")
    : { data: null };

  // Fontes com problema no último briefing (status de fontes na navegação diária)
  const notas = (briefing?.notas ?? {}) as {
    fontes?: { portal: string; status: string; error?: string }[];
  };
  const fontesComErro = (notas.fontes ?? []).filter((f) => f.status !== "ok");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("welcome")}, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <GenerateButton
          labels={{
            generateNow: t("generateNow"),
            generating: t("generating"),
            generateError: t("generateError"),
          }}
        />
      </div>

      {!briefing && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("placeholder")}</p>
          </CardContent>
        </Card>
      )}

      {fontesComErro.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-sm">
              ⚠️ {t("sourcesWithIssues")}:{" "}
              {fontesComErro.map((f) => `${f.portal} (${f.error ?? f.status})`).join(" · ")}{" "}
              — <Link href="/sources" className="underline underline-offset-2">{t("checkSources")}</Link>
            </p>
          </CardContent>
        </Card>
      )}

      {briefing && (
        <BriefingView briefing={briefing} clusters={clusters ?? []} posts={posts ?? []} />
      )}

      {briefing && (
        <p className="text-sm text-muted-foreground">
          <Link href="/briefings" className="underline underline-offset-2">
            {t("viewHistory")}
          </Link>
        </p>
      )}
    </div>
  );
}
