import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/app/(app)/sources/status-badge";
import type { Tables } from "@briefing/db/types";

const SECTIONS: { key: string; label: string; explain: string }[] = [
  {
    key: "must_read",
    label: "🔥 Must-read",
    explain: "O que realmente merece sua leitura hoje — leia isto e você está por dentro.",
  },
  {
    key: "relevante",
    label: "📌 Relevante",
    explain: "Vale saber que aconteceu; aprofunde só se tocar o seu negócio.",
  },
  {
    key: "no_radar",
    label: "📎 No radar",
    explain: "Sinais e movimentos para acompanhar — ainda sem desdobramento concreto.",
  },
  {
    key: "sinal_sem_fonte",
    label: "⚠️ Sinal sem fonte",
    explain: "Assunto esquentando fora das suas fontes de leitura — tratamos como sinal, sem link recomendado.",
  },
];

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
          <CardTitle className="font-display text-xl md:text-2xl">
            {title ?? t("todayBriefing")} —{" "}
            {new Date(`${briefing.run_date}T12:00:00`).toLocaleDateString("pt-BR")}
          </CardTitle>
          <CardDescription>
            {briefing.n_must_read} must-read · {briefing.n_relevante} relevantes ·{" "}
            {briefing.n_no_radar} no radar · {briefing.n_suppressed} {t("suppressed")} ·{" "}
            {briefing.n_updates} {t("updates")}
          </CardDescription>
        </CardHeader>
        {clusters.length === 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("emptyBriefing")}</p>
          </CardContent>
        )}
      </Card>

      {/* um card por categoria (decisão do Marcus) */}
      {SECTIONS.map((section) => {
        const items = clusters.filter((c) => c.categoria === section.key);
        if (items.length === 0) return null;
        return (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="font-display text-xl md:text-2xl">{section.label}</CardTitle>
              <CardDescription>{section.explain}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-white/6">
                    {items.map((c) => {
                      // notícias do assunto (jsonb; parse defensivo — briefings
                      // antigos têm itens vazio e caem no fallback de fonte única)
                      const noticias = (Array.isArray(c.itens) ? c.itens : []).filter(
                        (n): n is { title: string; url: string; portal: string } =>
                          Boolean(
                            n &&
                              typeof n === "object" &&
                              "url" in n &&
                              "title" in n &&
                              "portal" in n,
                          ),
                      );
                      // fonte canônica primeiro
                      noticias.sort((a, b) => Number(b.url === c.url) - Number(a.url === c.url));
                      return (
                      <li key={c.id} className="flex flex-col gap-1 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm empty:hidden">
                          {c.is_curator_pick && (
                            <StatusBadge status="partial" label={`✨ ${t("curatorPick")}`} />
                          )}
                          {c.em_alta && <StatusBadge status="ok" label={`📈 ${t("trending")}`} />}
                          {c.is_update && <StatusBadge status="ok" label={`🔁 ${t("update")}`} />}
                          {c.is_fallback && (
                            <StatusBadge status="partial" label={`🟡 ${t("fallback")}`} />
                          )}
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
                          {noticias.length === 0 && c.fonte && c.url && (
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
                        {noticias.length > 0 && (
                          <ul className="mt-1 flex flex-col gap-1" aria-label={t("coverage")}>
                            {noticias.map((n, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground">
                                {n.url === c.url ? "📖" : "↗"}{" "}
                                <a
                                  href={n.url}
                                  className="underline underline-offset-2"
                                  target="_blank"
                                >
                                  {n.title}
                                </a>{" "}
                                · {n.portal}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                      );
                    })}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {posts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl md:text-2xl">{t("posts")}</CardTitle>
            <CardDescription>{t("postsExplain")}</CardDescription>
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
