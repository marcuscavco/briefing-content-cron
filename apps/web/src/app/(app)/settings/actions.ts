"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";

function parseThemes(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function updateProfile(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTenant();

  const windowHours = Number(formData.get("window_hours") ?? profile.window_hours);

  await supabase
    .from("briefing_profiles")
    .update({
      name: String(formData.get("name") ?? profile.name).trim() || profile.name,
      themes: parseThemes(formData.get("themes")),
      excluded_themes: parseThemes(formData.get("excluded_themes")),
      delivery_time: String(formData.get("delivery_time") ?? profile.delivery_time),
      timezone: String(formData.get("timezone") ?? profile.timezone),
      window_hours: Number.isFinite(windowHours)
        ? Math.min(168, Math.max(6, windowHours))
        : profile.window_hours,
      channels: {
        email: formData.get("channel_email") === "on",
        whatsapp: formData.get("channel_whatsapp") === "on",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}
