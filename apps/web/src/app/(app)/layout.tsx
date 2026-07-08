import { BRAND } from "@briefing/config/brand";
import { createClient } from "@briefing/db/server";
import { isPlatformAdmin } from "@briefing/db/admin";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const t = await getTranslations("auth");
  const nav = await getTranslations("nav");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await isPlatformAdmin(user.id);

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-tight">{BRAND.productName}</span>
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              {nav("dashboard")}
            </Link>
            <Link href="/briefings" className="hover:text-foreground">
              {nav("briefings")}
            </Link>
            <Link href="/search" className="hover:text-foreground">
              {nav("search")}
            </Link>
            <Link href="/sources" className="hover:text-foreground">
              {nav("sources")}
            </Link>
            <Link href="/settings" className="hover:text-foreground">
              {nav("settings")}
            </Link>
            {admin && (
              <Link href="/admin" className="hover:text-foreground">
                {nav("admin")}
              </Link>
            )}
          </nav>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            {t("signOut")}
          </Button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
