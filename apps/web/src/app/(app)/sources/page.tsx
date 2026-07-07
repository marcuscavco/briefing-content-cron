import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/tenant";
import { addFromLibrary, deleteSource, revalidateSource, toggleSourceActive } from "./actions";
import { AddCustomSourceForm } from "./add-custom-form";
import { StatusBadge, TierBadge } from "./status-badge";

type PreviewItem = { title: string; url: string; publishedAt: string | null };

export default async function SourcesPage() {
  const t = await getTranslations("sources");
  const { supabase, profile } = await requireTenant();

  const [{ data: sources }, { data: suggestions }] = await Promise.all([
    supabase
      .from("sources")
      .select("*")
      .eq("profile_id", profile.id)
      .order("tier")
      .order("name"),
    supabase
      .from("suggested_sources")
      .select("*")
      .order("sort_order"),
  ]);

  const existingUrls = new Set(
    (sources ?? []).flatMap((s) => [s.url.toLowerCase(), s.feed_url?.toLowerCase() ?? ""]),
  );
  const availableSuggestions = (suggestions ?? []).filter(
    (s) => !existingUrls.has(s.url.toLowerCase()) && !existingUrls.has(s.feed_url?.toLowerCase() ?? "#"),
  );

  const statusLabel = (s: string) => t(`status.${s}` as Parameters<typeof t>[0]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yourSources")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(sources ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y">
              {(sources ?? []).map((source) => (
                <li key={source.id} className="flex flex-col gap-2 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${source.active ? "" : "text-muted-foreground line-through"}`}>
                      {source.name}
                    </span>
                    <TierBadge tier={source.tier} />
                    <StatusBadge status={source.last_status} label={statusLabel(source.last_status)} />
                    {source.last_checked_at && (
                      <span className="text-xs text-muted-foreground">
                        {t("lastChecked")}:{" "}
                        {new Date(source.last_checked_at).toLocaleString("pt-BR", {
                          timeZone: profile.timezone,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{source.feed_url ?? source.url}</p>
                  {source.last_error && (
                    <p className="text-xs text-destructive">{source.last_error}</p>
                  )}
                  {Array.isArray(source.last_preview) && source.last_preview.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        {t("preview")}
                      </summary>
                      <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                        {(source.last_preview as PreviewItem[]).map((item) => (
                          <li key={item.url}>{item.title}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="flex gap-2">
                    <form action={revalidateSource}>
                      <input type="hidden" name="id" value={source.id} />
                      <Button type="submit" variant="outline" size="sm">
                        {t("revalidate")}
                      </Button>
                    </form>
                    <form action={toggleSourceActive}>
                      <input type="hidden" name="id" value={source.id} />
                      <input type="hidden" name="active" value={String(!source.active)} />
                      <Button type="submit" variant="ghost" size="sm">
                        {source.active ? t("deactivate") : t("activate")}
                      </Button>
                    </form>
                    <form action={deleteSource}>
                      <input type="hidden" name="id" value={source.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        {t("remove")}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("library")}</CardTitle>
          <CardDescription>{t("librarySubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {availableSuggestions.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <TierBadge tier={s.suggested_tier} />
                    <span className="text-xs text-muted-foreground">{s.country}</span>
                    {s.requires_credential && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        {t("requiresCredential")}
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  )}
                </div>
                <form action={addFromLibrary}>
                  <input type="hidden" name="suggested_id" value={s.id} />
                  <Button type="submit" size="sm" variant="outline">
                    {t("add")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("customTitle")}</CardTitle>
          <CardDescription>{t("customSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AddCustomSourceForm
            labels={{
              name: t("name"),
              tier: t("tier"),
              siteUrl: t("siteUrl"),
              feedUrl: t("feedUrl"),
              credential: t("credential"),
              validateAndAdd: t("validateAndAdd"),
              validating: t("validating"),
              addedOk: t("addedOk"),
              addedPartial: t("addedPartial"),
              addedBlocked: t("addedBlocked"),
              addedError: t("addedError"),
              itemsFound: t("itemsFound"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
