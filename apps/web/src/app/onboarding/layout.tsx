import { createClient } from "@briefing/db/server";
import { redirect } from "next/navigation";

/**
 * Onboarding: tela cheia, sem a nav do app. É o fluxo único de entrada,
 * então aceita visitante sem conta (que começa criando uma). Já onboardado
 * vai para o dashboard.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("briefing_profiles")
      .select("onboarded_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (profile?.onboarded_at) redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-start px-5 py-16 md:justify-center md:px-8">
      {children}
    </main>
  );
}
