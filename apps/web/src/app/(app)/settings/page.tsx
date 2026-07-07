import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireTenant } from "@/lib/tenant";
import { updateProfile } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const t = await getTranslations("settings");
  const { profile } = await requireTenant();
  const { saved } = await searchParams;
  const channels = (profile.channels ?? {}) as { email?: boolean; whatsapp?: boolean };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
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
              <Label htmlFor="themes">{t("themes")}</Label>
              <Input
                id="themes"
                name="themes"
                defaultValue={(profile.themes ?? []).join(", ")}
                placeholder={t("themesHint")}
              />
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
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="channel_whatsapp"
                  defaultChecked={channels.whatsapp ?? false}
                  disabled
                />
                {t("channelWhatsapp")}
              </label>
            </fieldset>

            <Button type="submit" className="w-fit">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
