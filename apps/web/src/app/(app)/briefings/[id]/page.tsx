import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefingView } from "@/components/briefing/briefing-view";
import { requireTenant } from "@/lib/tenant";

export default async function BriefingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("briefings");
  const { supabase } = await requireTenant();
  const { id } = await params;

  // RLS garante que só briefings da própria account são visíveis.
  const { data: briefing } = await supabase
    .from("briefings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!briefing) notFound();

  const { data: clusters } = await supabase
    .from("clusters")
    .select("*")
    .eq("briefing_id", briefing.id)
    .in("categoria", ["must_read", "relevante", "no_radar", "sinal_sem_fonte"])
    .order("ordem");

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("briefing_id", briefing.id)
    .order("ordem");

  return (
    <div className="rise flex flex-col gap-8">
      <p className="text-sm">
        <Link href="/briefings" className="underline underline-offset-2">
          ← {t("backToArchive")}
        </Link>
      </p>
      <BriefingView
        briefing={briefing}
        clusters={clusters ?? []}
        posts={posts ?? []}
        title={t("briefingOf")}
      />
    </div>
  );
}
