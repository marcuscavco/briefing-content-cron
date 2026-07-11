import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/** Client para Client Components (browser). Usa apenas a anon key — RLS protege. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
