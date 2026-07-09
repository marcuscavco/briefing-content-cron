import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createAdminClient } from "@briefing/db/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/app/(app)/sources/status-badge";
import { addSuggestedSource, removeSuggestedSource, toggleSuggestedSource } from "../actions";

/** Backoffice: catálogo global de fontes sugeridas. Gate no layout. */
export default async function AdminCatalogPage() {
  const t = await getTranslations("admin");
  const admin = createAdminClient();

  const { data: sources } = await admin
    .from("suggested_sources")
    .select("id, name, url, feed_url, suggested_tier, category, country, is_free, active, sort_order")
    .order("sort_order");

  return (
    <div className="rise flex flex-col gap-8">
      <div>
        <p className="text-sm">
          <Link href="/admin" className="underline underline-offset-2">
            ← {t("backToAdmin")}
          </Link>
        </p>
        <h1 className="font-display mt-2 text-3xl font-medium tracking-tight md:text-4xl">{t("catalogTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("catalogSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("catalogAdd")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addSuggestedSource} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <Input name="name" placeholder={t("catalogName")} required />
            <Input name="url" placeholder="https://portal.com.br" required />
            <Input name="feed_url" placeholder={t("catalogFeedUrl")} />
            <div className="flex gap-2">
              <select
                name="suggested_tier"
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm"
                defaultValue="3"
              >
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
              </select>
              <select
                name="category"
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm"
                defaultValue="tecnologia"
              >
                <option value="tecnologia">tecnologia</option>
                <option value="negocios">negócios</option>
                <option value="economia">economia</option>
                <option value="geral">geral</option>
              </select>
              <select
                name="country"
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm"
                defaultValue="BR"
              >
                <option value="BR">BR</option>
                <option value="INTL">INTL</option>
              </select>
            </div>
            <Button type="submit" className="w-fit">
              {t("catalogAddButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("catalogList")}</CardTitle>
          <CardDescription>
            {t("catalogCount", { count: (sources ?? []).length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {(sources ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    {s.name}
                    <StatusBadge
                      status={s.active ? "ok" : "error"}
                      label={s.active ? t("catalogActive") : t("catalogPaused")}
                    />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Tier {s.suggested_tier} · {s.category} · {s.country}
                    {s.is_free ? "" : " · 💰"} · {s.feed_url ?? s.url}
                  </span>
                </div>
                <div className="flex gap-2">
                  <form action={toggleSuggestedSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(!s.active)} />
                    <Button type="submit" size="sm" variant="outline">
                      {s.active ? t("catalogPause") : t("catalogResume")}
                    </Button>
                  </form>
                  <form action={removeSuggestedSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {t("catalogRemove")}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
