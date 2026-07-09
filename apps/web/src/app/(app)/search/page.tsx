import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createAdminClient } from "@briefing/db/admin";
import { VoyageEmbeddingProvider } from "@briefing/curation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireTenant } from "@/lib/tenant";

/**
 * Busca no arquivo: full-text (clusters, RLS normal) + semântica (embedding da
 * query → match_topic_memory com o profile_id do PRÓPRIO tenant, via service
 * role — a RPC é revogada de authenticated, então o gate é o requireTenant).
 */

type SemanticHit = {
  id: string;
  canonical_title: string;
  summary: string | null;
  last_briefing_id: string | null;
  last_seen_at: string;
  appearances: number;
  similarity: number;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = await getTranslations("search");
  const { supabase, profile } = await requireTenant();
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 200);

  let ftsResults:
    | {
        id: string;
        briefing_id: string;
        titulo: string;
        resumo: string | null;
        categoria: string;
        is_update: boolean;
        topic_memory_id: string | null;
        run_date?: string;
      }[]
    | null = null;
  let semanticResults: SemanticHit[] | null = null;
  let semanticError = false;

  if (query) {
    const { data: clusters } = await supabase
      .from("clusters")
      .select("id, briefing_id, titulo, resumo, categoria, is_update, topic_memory_id")
      .textSearch("fts", query, { type: "websearch", config: "portuguese" })
      .limit(20);

    const briefingIds = [...new Set((clusters ?? []).map((c) => c.briefing_id))];
    const { data: briefings } = briefingIds.length
      ? await supabase.from("briefings").select("id, run_date").in("id", briefingIds)
      : { data: [] };
    const dateOf = new Map((briefings ?? []).map((b) => [b.id, b.run_date]));
    ftsResults = (clusters ?? []).map((c) => ({ ...c, run_date: dateOf.get(c.briefing_id) }));

    // Semântica: melhor esforço — sem key ou com erro do provedor, só FTS.
    if (process.env.VOYAGE_API_KEY) {
      try {
        const voyage = new VoyageEmbeddingProvider();
        const [embedding] = await voyage.embed([query]);
        const admin = createAdminClient();
        const { data, error } = await admin.rpc("match_topic_memory", {
          p_profile_id: profile.id,
          p_embedding: JSON.stringify(embedding),
          p_threshold: 0.45,
          p_count: 10,
          p_window_days: 365,
        });
        if (error) throw new Error(error.message);
        semanticResults = (data as SemanticHit[] | null) ?? [];
      } catch {
        semanticError = true;
      }
    }
  }

  return (
    <div className="rise flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form action="/search" method="get" className="flex max-w-xl gap-2">
        <Input name="q" defaultValue={query} placeholder={t("placeholder")} autoFocus />
        <Button type="submit">{t("submit")}</Button>
      </form>

      {query && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ftsTitle")}</CardTitle>
            <CardDescription>{t("ftsSubtitle", { query })}</CardDescription>
          </CardHeader>
          <CardContent>
            {(ftsResults ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            )}
            <ul className="divide-y">
              {(ftsResults ?? []).map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3">
                  <Link
                    href={`/briefings/${c.briefing_id}`}
                    className="font-medium hover:underline underline-offset-2"
                  >
                    {c.titulo}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {c.run_date &&
                      new Date(`${c.run_date}T12:00:00`).toLocaleDateString("pt-BR")}
                    {c.is_update && " · 🔁"}
                    {c.topic_memory_id && (
                      <>
                        {" · "}
                        <Link
                          href={`/topics/${c.topic_memory_id}`}
                          className="underline underline-offset-2"
                        >
                          {t("timelineLink")}
                        </Link>
                      </>
                    )}
                  </span>
                  {c.resumo && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.resumo}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {query && semanticResults !== null && (
        <Card>
          <CardHeader>
            <CardTitle>{t("semanticTitle")}</CardTitle>
            <CardDescription>{t("semanticSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {semanticResults.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            )}
            <ul className="divide-y">
              {semanticResults.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 py-3">
                  <Link
                    href={`/topics/${s.id}`}
                    className="font-medium hover:underline underline-offset-2"
                  >
                    {s.canonical_title}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {t("appearances", { count: s.appearances })} ·{" "}
                    {new Date(s.last_seen_at).toLocaleDateString("pt-BR")} ·{" "}
                    {Math.round(s.similarity * 100)}% {t("similar")}
                  </span>
                  {s.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{s.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {query && semanticError && (
        <p className="text-sm text-muted-foreground">{t("semanticUnavailable")}</p>
      )}
    </div>
  );
}
