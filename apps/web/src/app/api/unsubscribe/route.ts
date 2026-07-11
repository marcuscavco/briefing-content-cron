import { createAdminClient } from "@briefing/db/admin";
import { verifyUnsubscribeToken } from "@briefing/delivery";

/**
 * Unsubscribe one-click (LGPD / brief §6.5): token HMAC no link do email
 * desliga o canal de email do profile. GET para funcionar de qualquer cliente
 * de email; página simples de confirmação em PT-BR.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const secret = process.env.CRON_SECRET;
  const profileId = token && secret ? verifyUnsubscribeToken(token, secret) : null;

  if (!profileId) {
    return new Response("<html lang='pt-BR'><body><p>Link inválido ou expirado.</p></body></html>", {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("briefing_profiles")
    .select("channels")
    .eq("id", profileId)
    .single();

  if (profile) {
    await admin
      .from("briefing_profiles")
      .update({ channels: { ...((profile.channels as object) ?? {}), email: false } })
      .eq("id", profileId);
  }

  return new Response(
    "<html lang='pt-BR'><body style='font-family:sans-serif;text-align:center;padding:48px'><h2>Emails cancelados ✅</h2><p>Você não vai mais receber o briefing por email. Pode reativar quando quiser nas configurações do app.</p></body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
