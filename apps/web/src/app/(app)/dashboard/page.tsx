import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { ArrowBubble } from "@/components/ui/arrow-bubble";
import { BriefingView } from "@/components/briefing/briefing-view";
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

  const [{ data: clusters }, { data: posts }, { count: sourcesTotal }, { count: sourcesOk }, { count: briefingsTotal }] =
    await Promise.all([
      briefing
        ? supabase
            .from("clusters")
            .select("*")
            .eq("briefing_id", briefing.id)
            .in("categoria", ["must_read", "relevante", "no_radar", "sinal_sem_fonte"])
            .order("ordem")
        : Promise.resolve({ data: null }),
      briefing
        ? supabase.from("posts").select("*").eq("briefing_id", briefing.id).order("ordem")
        : Promise.resolve({ data: null }),
      supabase.from("sources").select("id", { count: "exact", head: true }).eq("profile_id", profile.id).eq("active", true),
      supabase
        .from("sources")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("active", true)
        .eq("last_status", "ok"),
      supabase.from("briefings").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
    ]);

  const notas = (briefing?.notas ?? {}) as {
    fontes?: { portal: string; status: string; error?: string }[];
  };
  const fontesComErro = (notas.fontes ?? []).filter((f) => f.status !== "ok");
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  const shortcuts = [
    { href: "/briefings", title: t("shortcutHistoryTitle"), desc: t("shortcutHistoryDesc") },
    { href: "/sources", title: t("shortcutSourcesTitle"), desc: t("shortcutSourcesDesc") },
    { href: "/settings", title: t("shortcutSettingsTitle"), desc: t("shortcutSettingsDesc") },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* hero */}
      <section className="rise flex flex-col gap-5 pt-6">
        <span className="eyebrow w-max">{t("eyebrow")}</span>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="font-display max-w-xl text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            {t("greeting")}, <span className="text-muted-foreground">{firstName}</span>.
          </h1>
          <GenerateButton
            labels={{
              generateNow: t("generateNow"),
              generating: t("generating"),
              generateError: t("generateError"),
            }}
          />
        </div>
        {briefing && (
          <p className="text-sm text-muted-foreground">
            {t("lastBriefing")}{" "}
            {new Date(`${briefing.run_date}T12:00:00`).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
        )}
      </section>

      {/* bento de big numbers */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="bezel rise rise-1 md:col-span-5">
          <div className="bezel-core flex h-full flex-col justify-between gap-8 p-7">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {t("statMustRead")}
            </span>
            <div>
              <p className="big-number text-7xl font-medium leading-none md:text-8xl">
                {briefing?.n_must_read ?? 0}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{t("statMustReadDesc")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-7">
          {[
            {
              label: t("statUpdates"),
              value: briefing?.n_updates ?? 0,
              desc: t("statUpdatesDesc"),
              cls: "rise-2",
            },
            {
              label: t("statSuppressed"),
              value: briefing?.n_suppressed ?? 0,
              desc: t("statSuppressedDesc"),
              cls: "rise-3",
            },
            {
              label: t("statSources"),
              value: `${sourcesOk ?? 0}/${sourcesTotal ?? 0}`,
              desc: t("statSourcesDesc"),
              cls: "rise-4",
            },
          ].map((s) => (
            <div key={s.label} className={`bezel rise ${s.cls}`}>
              <div className="bezel-core flex h-full flex-col justify-between gap-6 p-6">
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {s.label}
                </span>
                <div>
                  <p className="big-number text-4xl font-medium leading-none md:text-5xl">
                    {s.value}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="bezel rise rise-5 sm:col-span-3">
            <div className="bezel-core flex items-center justify-between gap-4 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                <span className="big-number mr-2 text-2xl text-foreground">{briefingsTotal ?? 0}</span>
                {t("statArchive")}
              </p>
              <Link href="/briefings" className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("viewHistory")}
                <ArrowBubble className="size-7" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* shortcuts */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {shortcuts.map((s, i) => (
          <Link key={s.href} href={s.href} className={`bezel rise rise-${i + 2} group block transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1`}>
            <div className="bezel-core flex h-full flex-col justify-between gap-8 p-6">
              <div className="flex items-start justify-between">
                <span className="font-display text-base font-medium">{s.title}</span>
                <ArrowBubble />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </Link>
        ))}
      </section>

      {fontesComErro.length > 0 && (
        <section className="bezel rise">
          <div className="bezel-core flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="text-sm">
              <span className="mr-2">⚠️</span>
              {t("sourcesWithIssues")}:{" "}
              <span className="text-muted-foreground">
                {fontesComErro.map((f) => `${f.portal} (${f.error ?? f.status})`).join(" · ")}
              </span>
            </p>
            <Link href="/sources" className="text-sm underline underline-offset-4">
              {t("checkSources")}
            </Link>
          </div>
        </section>
      )}

      {/* briefing do dia */}
      {briefing ? (
        <section className="rise rise-3 flex flex-col gap-6">
          <BriefingView briefing={briefing} clusters={clusters ?? []} posts={posts ?? []} />
        </section>
      ) : (
        <section className="bezel rise rise-3">
          <div className="bezel-core px-6 py-10 text-center text-sm text-muted-foreground">
            {t("placeholder")}
          </div>
        </section>
      )}
    </div>
  );
}
