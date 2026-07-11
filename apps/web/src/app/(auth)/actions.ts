"use server";

import { createClient } from "@briefing/db/server";
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
  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: {
      data: { full_name: String(formData.get("full_name") ?? "") },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    redirect("/signup?error=generic");
  }
  // Com confirmação de email desligada (local) já existe sessão; com ela ligada
  // (produção), o usuário precisa clicar no link.
  if (data.session) {
    redirect("/dashboard");
  }
  redirect("/login?notice=signup_success");
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
