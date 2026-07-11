import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireTenant } from "@/lib/tenant";
import { updateProfile } from "./actions";
import { ThemePicker } from "./theme-picker";
import { WhatsappDestinations } from "./whatsapp-destinations";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const t = await getTranslations("settings");
  const { supabase, profile } = await requireTenant();
  const { saved } = await searchParams;

  const { data: destinations } = await supabase
    .from("whatsapp_destinations")
    .select("id, phone, label, kind, verified, active")
    .eq("profile_id", profile.id)
    .order("created_at");
  const hasVerified = (destinations ?? []).some((d) => d.verified);
  const channels = (profile.channels ?? {}) as { email?: boolean; whatsapp?: boolean };

  return (
    <div className="rise flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {saved && <p className="text-sm text-emerald-700 dark:text-emerald-400">{t("saved")}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{profile.name}</CardTitle>
          <CardDescription>{profile.timezone}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="flex max-w-xl flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("profileName")}</Label>
              <Input id="name" name="name" defaultValue={profile.name} />
            </div>

            <div className="grid gap-2">
              <Label>{t("themes")}</Label>
              <ThemePicker initial={profile.themes ?? []} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="excluded_themes">{t("excludedThemes")}</Label>
              <Input
                id="excluded_themes"
                name="excluded_themes"
                defaultValue={(profile.excluded_themes ?? []).join(", ")}
                placeholder={t("excludedThemesHint")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="delivery_time">{t("deliveryTime")}</Label>
                <Input
                  id="delivery_time"
                  name="delivery_time"
                  type="time"
                  defaultValue={profile.delivery_time.slice(0, 5)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">{t("timezone")}</Label>
                <Input id="timezone" name="timezone" defaultValue={profile.timezone} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="window_hours">{t("windowHours")}</Label>
                <Input
                  id="window_hours"
                  name="window_hours"
                  type="number"
                  min={6}
                  max={168}
                  defaultValue={profile.window_hours}
                />
              </div>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">{t("channels")}</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="channel_email" defaultChecked={channels.email ?? true} />
                {t("channelEmail")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="channel_whatsapp"
                  defaultChecked={channels.whatsapp ?? false}
                  disabled={!hasVerified}
                />
                {hasVerified ? t("channelWhatsapp") : t("channelWhatsappNeedsDestination")}
              </label>
            </fieldset>

            <SubmitButton className="w-fit" pendingText={t("saving")}>
              {t("save")}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("delivery.title")}</CardTitle>
          <CardDescription>{t("delivery.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsappDestinations destinations={destinations ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
