import { createClient } from "@briefing/db/server";
import { requireTenant } from "@/lib/tenant";
import { formatBrPhone } from "@/lib/phone";
import { AccountSteps } from "./account-steps";
import { OnboardingWizard } from "./onboarding-wizard";

/**
 * Fluxo único: sem sessão, mostra boas-vindas → criar conta → confirmar
 * email; com sessão, o wizard retoma do primeiro passo incompleto (2 a 7).
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirm?: string; email?: string }>;
}) {
  const authClient = await createClient();
  const {
    data: { user: sessionUser },
  } = await authClient.auth.getUser();

  if (!sessionUser) {
    const { error, confirm, email } = await searchParams;
    return (
      <AccountSteps
        initial={confirm ? "confirm" : error ? "account" : "welcome"}
        email={email ?? null}
        hasError={Boolean(error)}
      />
    );
  }

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
