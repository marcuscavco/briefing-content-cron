import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/app/(app)/sources/status-badge";
import type { Tables } from "@briefing/db/types";

const CATEGORIA_LABEL: Record<string, string> = {
  must_read: "🔥 Must-read",
  relevante: "📌 Relevante",
  no_radar: "📎 No radar",
  sinal_sem_fonte: "⚠️ Sinal sem fonte",
};

type Briefing = Tables<"briefings">;
type Cluster = Tables<"clusters">;
type Post = Tables<"posts">;

/**
 * Render compartilhado de um briefing (dashboard "hoje" e /briefings/[id]).
 * Server component puro: recebe dados já carregados sob RLS pelo caller.
 */
export async function BriefingView({
  briefing,
  clusters,
  posts,
  title,
}: {
  briefing: Briefing;
  clusters: Cluster[];
  posts: Post[];
  title?: string;
}) {
  const t = await getTranslations("dashboard");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {title ?? t("todayBriefing")} —{" "}
            {new Date(`${briefing.run_date}T12:00:00`).toLocaleDateString("pt-BR")}
          </CardTitle>
          <CardDescription>
            {briefing.n_must_read} must-read · {briefing.n_relevante} relevantes ·{" "}
            {briefing.n_no_radar} no radar · {briefing.n_suppressed} {t("suppressed")} ·{" "}
            {briefing.n_updates} {t("updates")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("emptyBriefing")}</p>
          )}
          <ul className="divide-y">
            {clusters.map((c) => (
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
                <span className="font-medium">
                  {c.topic_memory_id ? (
                    <Link
                      href={`/topics/${c.topic_memory_id}`}
                      className="hover:underline underline-offset-2"
                      title={t("topicTimeline")}
                    >
                      {c.titulo}
                    </Link>
                  ) : (
                    c.titulo
                  )}
                </span>
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
                    🔁 <span className="font-medium">{t("whatChanged")}:</span> {c.update_resumo}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {posts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("posts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {posts
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
            {posts.some((p) => p.skip) && (
              <p className="mt-4 text-xs text-muted-foreground">
                ⏭️ {t("skips")}:{" "}
                {posts
                  .filter((p) => p.skip)
                  .map((p) => p.skip_motivo)
                  .join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
