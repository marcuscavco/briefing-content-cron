import { createClient } from "@briefing/db/server";
import { isPlatformAdmin } from "@briefing/db/admin";
import { redirect } from "next/navigation";

/**
 * Gate do backoffice: platform_admins não tem policy nenhuma — a autorização é
 * exclusivamente server-side (service role) via isPlatformAdmin. Quem não é
 * admin nem descobre que a rota existe.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isPlatformAdmin(user.id))) redirect("/dashboard");

  return <>{children}</>;
}
