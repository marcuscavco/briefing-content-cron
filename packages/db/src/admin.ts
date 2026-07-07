import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * ÚNICO ponto do repo que toca a SUPABASE_SERVICE_ROLE_KEY.
 * Bypassa RLS por completo — usar apenas em rotas server após autorização
 * explícita: getUser() → requirePlatformAdmin(user.id) → admin client.
 * O import de "server-only" quebra o build se isto vazar para um Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Lança erro se o usuário não for platform_admin. Bypass nunca acontece via policy. */
export async function requirePlatformAdmin(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`platform_admins lookup failed: ${error.message}`);
  if (!data) throw new Error("forbidden: not a platform admin");
}
