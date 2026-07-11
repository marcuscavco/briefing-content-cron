import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Aponta para o stack local (`supabase start`). As chaves default do CLI local
 * são públicas e fixas — não são segredo. Em CI, `supabase status -o env`
 * exporta os mesmos valores.
 */
/** `supabase status -o env` pode emitir valores entre aspas — remove. */
function env(name: string): string | undefined {
  return process.env[name]?.replace(/^"(.*)"$/, "$1");
}

export const SUPABASE_URL = env("SUPABASE_URL") ?? env("API_URL") ?? "http://127.0.0.1:54321";

export const ANON_KEY =
  env("SUPABASE_ANON_KEY") ??
  env("ANON_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SERVICE_ROLE_KEY =
  env("SUPABASE_SERVICE_ROLE_KEY") ??
  env("SERVICE_ROLE_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cria um usuário confirmado (dispara o trigger de account) e devolve um client logado. */
export async function createUserWithSession(
  admin: SupabaseClient,
  email: string,
  password: string,
  fullName?: string,
): Promise<{ user: User; client: SupabaseClient }> {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (createError || !created.user) {
    throw new Error(`createUser(${email}) failed: ${createError?.message}`);
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`signIn(${email}) failed: ${signInError.message}`);
  }

  return { user: created.user, client };
}
