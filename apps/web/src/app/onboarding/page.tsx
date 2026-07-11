import { requireTenant } from "@/lib/tenant";
import { formatBrPhone } from "@/lib/phone";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const { supabase, user, profile } = await requireTenant();

  const [{ data: suggestions }, { count: sourcesCount }, { data: verified }] = await Promise.all([
    supabase
      .from("suggested_sources")
      .select("id, name, description, suggested_tier, category, country, is_free")
      .eq("active", true)
      .eq("is_free", true)
      .neq("type", "instagram")
      .order("sort_order"),
    supabase
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("whatsapp_destinations")
      .select("phone")
      .eq("profile_id", profile.id)
      .eq("verified", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <OnboardingWizard
      firstName={firstName}
      initialName={profile.name ?? "Briefing diário"}
      initialThemes={profile.themes ?? []}
      sourcesCount={sourcesCount ?? 0}
      verifiedMasked={verified ? formatBrPhone(verified.phone) : null}
      suggestions={suggestions ?? []}
    />
  );
}
