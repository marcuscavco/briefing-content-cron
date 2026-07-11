import { createClient } from "@briefing/db/server";
import { redirect } from "next/navigation";

/**
 * Contexto do tenant para rotas server: usuário + account + profile default.
 * RLS já restringe as queries; isto só resolve os IDs uma vez por request.
 */
export async function requireTenant() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("account_id, role")
    .limit(1)
    .maybeSingle();
  if (!membership) throw new Error("usuário sem account — trigger de signup falhou?");

  const { data: profile } = await supabase
    .from("briefing_profiles")
    .select("*")
    .eq("account_id", membership.account_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!profile) throw new Error("account sem briefing profile — trigger falhou?");

  return { supabase, user, accountId: membership.account_id, role: membership.role, profile };
}
