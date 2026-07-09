import { BRAND } from "@briefing/config/brand";
import { createClient } from "@briefing/db/server";
import { isPlatformAdmin } from "@briefing/db/admin";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
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

  const items = [
    { href: "/dashboard", label: nav("dashboard") },
    { href: "/briefings", label: nav("briefings") },
    { href: "/sources", label: nav("sources") },
    { href: "/settings", label: nav("settings") },
    ...(admin ? [{ href: "/admin", label: nav("admin") }] : []),
  ];

  return (
    <div className="min-h-[100dvh]">
      <AppNav
        brand={BRAND.productName}
        items={items}
        signOutSlot={
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              {t("signOut")}
            </Button>
          </form>
        }
      />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-32 md:px-6">{children}</main>
    </div>
  );
}
