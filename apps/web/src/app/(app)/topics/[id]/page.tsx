import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/app/(app)/sources/status-badge";
import { requireTenant } from "@/lib/tenant";

/** Timeline de assunto: todas as aparições de um tópico da memória (RLS). */
export default async function TopicTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("topics");
  const { supabase } = await requireTenant();
  const { id } = await params;

  const { data: topic } = await supabase
    .from("topic_memory")
    .select("id, canonical_title, summary, entities, appearances, first_seen_at, last_seen_at")
    .eq("id", id)
    .maybeSingle();
  if (!topic) notFound();

  const { data: clusters } = await supabase
    .from("clusters")
    .select(
      "id, briefing_id, titulo, resumo, categoria, heat_score, is_update, update_resumo, fonte, url, created_at",
    )
    .eq("topic_memory_id", id)
    .order("created_at", { ascending: true });

  const briefingIds = [...new Set((clusters ?? []).map((c) => c.briefing_id))];
  const { data: briefings } = briefingIds.length
    ? await supabase.from("briefings").select("id, run_date").in("id", briefingIds)
    : { data: [] };
  const dateOf = new Map((briefings ?? []).map((b) => [b.id, b.run_date]));

  return (
    <div className="rise flex flex-col gap-8">
      <p className="text-sm">
        <Link href="/briefings" className="underline underline-offset-2">
          ← {t("backToArchive")}
        </Link>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>🧠 {topic.canonical_title}</CardTitle>
          <CardDescription>
            {t("appearances", { count: topic.appearances })} ·{" "}
            {t("firstSeen")} {new Date(topic.first_seen_at).toLocaleDateString("pt-BR")} ·{" "}
            {t("lastSeen")} {new Date(topic.last_seen_at).toLocaleDateString("pt-BR")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {topic.summary && <p className="text-sm text-muted-foreground">{topic.summary}</p>}
          {(topic.entities ?? []).length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("entities")}: {(topic.entities ?? []).join(" · ")}
            </p>
          )}

          <ol className="relative flex flex-col gap-4 border-l pl-4">
            {(clusters ?? []).map((c) => {
              const runDate = dateOf.get(c.briefing_id);
              return (
                <li key={c.id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={`/briefings/${c.briefing_id}`}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {runDate
                        ? new Date(`${runDate}T12:00:00`).toLocaleDateString("pt-BR")
                        : new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </Link>
                    {c.is_update && <StatusBadge status="ok" label={`🔁 ${t("update")}`} />}
                  </div>
                  <span className="text-sm">{c.titulo}</span>
                  {c.is_update && c.update_resumo ? (
                    <p className="text-sm text-muted-foreground">
                      🔁 <span className="font-medium">{t("whatChanged")}:</span>{" "}
                      {c.update_resumo}
                    </p>
                  ) : (
                    c.resumo && <p className="text-sm text-muted-foreground">💡 {c.resumo}</p>
                  )}
                  {c.fonte && c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      className="text-xs text-muted-foreground underline underline-offset-2"
                    >
                      {c.fonte}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>

          {(clusters ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noClusters")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
