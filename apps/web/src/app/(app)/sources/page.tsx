import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireTenant } from "@/lib/tenant";
import { deleteSource, revalidateSource, toggleSourceActive } from "./actions";
import { AddSourceWizard } from "./add-source-wizard";
import { StatusBadge, TierBadge } from "./status-badge";
import { PreviewCards } from "./preview-cards";

type PreviewItem = {
  title: string;
  url: string;
  publishedAt: string | null;
  summary?: string | null;
  image?: string | null;
};

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
    <div className="rise flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Modal
          trigger={<Button>{t("addSource")}</Button>}
          title={t("addModalTitle")}
          description={t("addModalSubtitle")}
        >
          <AddSourceWizard
            suggestions={availableSuggestions.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              suggested_tier: s.suggested_tier,
              country: s.country,
              requires_credential: s.requires_credential,
            }))}
          />
        </Modal>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yourSources")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(sources ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-white/6">
              {(sources ?? []).map((source) => {
                const preview = (
                  Array.isArray(source.last_preview) ? source.last_preview : []
                ) as PreviewItem[];
                return (
                  <li key={source.id} className="flex flex-col gap-3 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-display font-medium ${source.active ? "" : "text-muted-foreground line-through"}`}>
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

                    <PreviewCards items={preview} />

                    <div className="flex flex-wrap gap-2">
                      <form action={revalidateSource}>
                        <input type="hidden" name="id" value={source.id} />
                        <SubmitButton variant="outline" size="sm" pendingText={t("revalidating")}>
                          {t("revalidate")}
                        </SubmitButton>
                      </form>
                      <form action={toggleSourceActive}>
                        <input type="hidden" name="id" value={source.id} />
                        <input type="hidden" name="active" value={String(!source.active)} />
                        <SubmitButton variant="ghost" size="sm">
                          {source.active ? t("deactivate") : t("activate")}
                        </SubmitButton>
                      </form>
                      <form action={deleteSource}>
                        <input type="hidden" name="id" value={source.id} />
                        <SubmitButton variant="ghost" size="sm" className="text-destructive">
                          {t("remove")}
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
