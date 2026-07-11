"use server";

import { createClient } from "@briefing/db/server";
import { createAdminClient } from "@briefing/db/admin";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host")!;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });

  // Deep link (ex.: /b/<id> do WhatsApp): só caminhos internos são honrados.
  const next = String(formData.get("next") ?? "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (error) {
    redirect(`/login?error=invalid_credentials${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  redirect(safeNext);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  // Sem confirmação de email (decisão de produto: fluxo único, sem fricção).
  // O usuário nasce confirmado via admin API e entra logado na sequência,
  // independente da configuração de "Confirm email" do projeto Supabase.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: String(formData.get("full_name") ?? "") },
  });

  if (createError) {
    const exists =
      createError.code === "email_exists" || /already/i.test(createError.message ?? "");
    redirect(`/onboarding?error=${exists ? "exists" : "generic"}`);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    redirect("/onboarding?error=generic");
  }
  redirect("/onboarding");
}

export async function sendMagicLink(formData: FormData) {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: String(formData.get("email")),
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    redirect("/login?error=generic");
  }
  redirect("/login?notice=magic_link_sent");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=generic");
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
