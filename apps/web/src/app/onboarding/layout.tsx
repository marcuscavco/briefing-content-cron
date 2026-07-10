import { createClient } from "@briefing/db/server";
import { redirect } from "next/navigation";

/** Onboarding: tela cheia, sem a nav do app. Já onboardado → dashboard. */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("briefing_profiles")
    .select("onboarded_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center px-5 py-16 md:px-8">
      {children}
    </main>
  );
}
