import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/tenant";
import { StatusBadge } from "../sources/status-badge";
import { GenerateButton } from "./generate-button";

const CATEGORIA_LABEL: Record<string, string> = {
  must_read: "🔥 Must-read",
  relevante: "📌 Relevante",
  no_radar: "📎 No radar",
  sinal_sem_fonte: "⚠️ Sinal sem fonte",
};

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

      {briefing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("todayBriefing")} —{" "}
              {new Date(`${briefing.run_date}T12:00:00`).toLocaleDateString("pt-BR")}
            </CardTitle>
            <CardDescription>
              {briefing.n_must_read} must-read · {briefing.n_relevante} relevantes ·{" "}
              {briefing.n_no_radar} no radar · {briefing.n_suppressed} {t("suppressed")} ·{" "}
              {briefing.n_updates} {t("updates")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(clusters ?? []).map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                    </span>
                    {c.is_curator_pick && (
                      <StatusBadge status="partial" label={`✨ ${t("curatorPick")}`} />
                    )}
                    {c.is_update && <StatusBadge status="ok" label={`🔁 ${t("update")}`} />}
                    {c.is_fallback && <StatusBadge status="partial" label={`🟡 ${t("fallback")}`} />}
                  </div>
                  <span className="font-medium">{c.titulo}</span>
                  <span className="text-sm text-muted-foreground">
                    💼 {c.relevancia_empresarial}/3 · 💻 {c.relevancia_tecnica}/3 · Heat{" "}
                    {c.heat_score}
                    {c.fonte && c.url && (
                      <>
                        {" · "}
                        <a href={c.url} className="underline underline-offset-2" target="_blank">
                          {c.fonte}
                        </a>
                      </>
                    )}
                  </span>
                  {c.resumo && <p className="text-sm text-muted-foreground">💡 {c.resumo}</p>}
                  {c.is_update && c.update_resumo && (
                    <p className="text-sm">
                      🔁 <span className="font-medium">{t("whatChanged")}:</span>{" "}
                      {c.update_resumo}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {briefing && (posts ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("posts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {(posts ?? [])
                .filter((p) => !p.skip)
                .map((p) => (
                  <li key={p.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {p.formato} · 🎯 {p.angulo_tipo}
                    </p>
                    <p className="mt-1">📣 “{p.gancho}”</p>
                    {Array.isArray(p.estrutura) && (
                      <p className="mt-1 text-muted-foreground">
                        🧱{" "}
                        {(p.estrutura as { slide: number; texto: string }[])
                          .map((s) => `${s.slide}. ${s.texto}`)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
            {(posts ?? []).some((p) => p.skip) && (
              <p className="mt-4 text-xs text-muted-foreground">
                ⏭️ {t("skips")}:{" "}
                {(posts ?? [])
                  .filter((p) => p.skip)
                  .map((p) => p.skip_motivo)
                  .join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
