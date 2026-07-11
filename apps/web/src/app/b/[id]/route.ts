import { createClient } from "@briefing/db/server";
import { redirect } from "next/navigation";

/**
 * Link inteligente do WhatsApp: /b/<briefing_id>.
 * Briefing de HOJE → /dashboard (visão do dia); antigo → /briefings/<id>
 * (arquivo daquele dia). Deslogado cai no login e volta para cá depois.
 * RLS garante que briefing de outra conta não resolve.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/b/${id}`);

  const { data: briefing } = await supabase
    .from("briefings")
    .select("id, run_date, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (!briefing) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("briefing_profiles")
    .select("timezone")
    .eq("id", briefing.profile_id)
    .maybeSingle();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile?.timezone ?? "America/Sao_Paulo",
  }).format(new Date());

  redirect(briefing.run_date === today ? "/dashboard" : `/briefings/${briefing.id}`);
}
