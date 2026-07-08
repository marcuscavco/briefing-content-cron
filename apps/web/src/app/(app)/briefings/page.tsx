import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/lib/tenant";

const PAGE_SIZE = 30;

export default async function BriefingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("briefings");
  const { supabase, profile } = await requireTenant();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const from = (page - 1) * PAGE_SIZE;
  const { data: briefings, count } = await supabase
    .from("briefings")
    .select("id, run_date, n_must_read, n_relevante, n_no_radar, n_updates, n_suppressed, n_posts", {
      count: "exact",
    })
    .eq("profile_id", profile.id)
    .order("run_date", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const hasNext = from + PAGE_SIZE < total;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/search" className="text-sm underline underline-offset-2">
          {t("searchLink")}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("archive")}</CardTitle>
          <CardDescription>{t("total", { count: total })}</CardDescription>
        </CardHeader>
        <CardContent>
          {(briefings ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
          <ul className="divide-y">
            {(briefings ?? []).map((b) => (
              <li key={b.id} className="py-3">
                <Link href={`/briefings/${b.id}`} className="group flex flex-col gap-1">
                  <span className="font-medium group-hover:underline underline-offset-2">
                    {new Date(`${b.run_date}T12:00:00`).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    🔥 {b.n_must_read} · 📌 {b.n_relevante} · 📎 {b.n_no_radar} · 🔁 {b.n_updates}{" "}
                    · 🤫 {b.n_suppressed} · 📱 {b.n_posts}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {(page > 1 || hasNext) && (
            <div className="mt-4 flex gap-4 text-sm">
              {page > 1 && (
                <Link href={`/briefings?page=${page - 1}`} className="underline underline-offset-2">
                  ← {t("newer")}
                </Link>
              )}
              {hasNext && (
                <Link href={`/briefings?page=${page + 1}`} className="underline underline-offset-2">
                  {t("older")} →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
