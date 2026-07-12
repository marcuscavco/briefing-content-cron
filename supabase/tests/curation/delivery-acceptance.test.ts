import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { deliverBriefing } from "@briefing/curation";
import { WHATSAPP_HARD_LIMIT, type EmailSender, type WhatsappSender } from "@briefing/delivery";
import { adminClient, createUserWithSession } from "../rls/helpers";

/**
 * ACEITE DA FASE 3: briefing chega nos canais; DESTINO NÃO VERIFICADO É
 * RECUSADO; retry não duplica envio. Roda contra o stack local com senders fake.
 */

const runId = Math.random().toString(36).slice(2, 10);

let admin: SupabaseClient;
let user: User;
let accountId: string;
let profileId: string;
let briefingId: string;

class FakeWhatsapp implements WhatsappSender {
  sent: { phone: string; message: string }[] = [];
  async sendText(phone: string, message: string) {
    this.sent.push({ phone, message });
    return { ok: true, response: { fake: true } };
  }
}

class FakeEmail implements EmailSender {
  sent: { to: string; subject: string }[] = [];
  async send(to: string, subject: string) {
    this.sent.push({ to, subject });
    return { ok: true, response: { fake: true } };
  }
}

beforeAll(async () => {
  admin = adminClient();
  ({ user } = await createUserWithSession(admin, `deliv-${runId}@test.local`, "senha-teste-123"));
  const { data: m } = await admin.from("memberships").select("account_id").eq("user_id", user.id).single();
  accountId = m!.account_id;
  const { data: p } = await admin.from("briefing_profiles").select("id").eq("account_id", accountId).single();
  profileId = p!.id;

  // liga os dois canais
  await admin
    .from("briefing_profiles")
    .update({ channels: { email: true, whatsapp: true } })
    .eq("id", profileId);

  // briefing persistido com 1 cluster e 1 post (estado pós-persist do pipeline)
  const { data: b } = await admin
    .from("briefings")
    .insert({
      account_id: accountId,
      profile_id: profileId,
      run_date: "2026-07-08",
      n_must_read: 1,
      n_clusters_total: 1,
    })
    .select("id")
    .single();
  briefingId = b!.id;
  const { data: c } = await admin
    .from("clusters")
    .insert({
      account_id: accountId,
      briefing_id: briefingId,
      ordem: 1,
      titulo: "Assunto de teste para entrega",
      resumo: "Resumo do assunto de teste.",
      categoria: "must_read",
      heat_score: 6,
      relevancia_tema: 3,
      impacto_geral: 2,
      fonte: "Tecnoblog",
      url: "https://tecnoblog.net/teste",
    })
    .select("id")
    .single();
  await admin.from("posts").insert({
    account_id: accountId,
    briefing_id: briefingId,
    cluster_id: c!.id,
    ordem: 1,
    formato: "Carrossel",
    gancho: "Gancho de teste para o post.",
    estrutura: [{ slide: 1, texto: "Bloco 1" }],
    angulo_tipo: "traducao_empresario",
    angulo_descricao: "descrição do ângulo",
    skip: false,
  });

  // dois destinos: um verificado, um NÃO verificado
  await admin.from("whatsapp_destinations").insert([
    {
      account_id: accountId,
      profile_id: profileId,
      kind: "personal",
      phone: "5585900000001",
      verified: true,
      verified_at: new Date().toISOString(),
    },
    {
      account_id: accountId,
      profile_id: profileId,
      kind: "group",
      phone: "120363000000000042-group",
      verified: false,
    },
  ]);
});

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
  if (accountId) await admin.from("accounts").delete().eq("id", accountId);
});

describe("entrega (aceite Fase 3)", () => {
  const whatsapp = new FakeWhatsapp();
  const email = new FakeEmail();

  it("envia email ao owner e 2 mensagens ≤1500 ao destino verificado; recusa o não verificado", async () => {
    const profile = {
      id: profileId,
      accountId,
      themes: [],
      excludedThemes: [],
      windowHours: 48,
      maxPostsPerDay: 3,
      timezone: "America/Sao_Paulo",
      channels: { email: true, whatsapp: true },
      voiceOverrides: null,
    };

    const log = await deliverBriefing(
      { db: admin, email, whatsapp, appBaseUrl: "https://app.test", unsubscribeSecret: "s3cr3t", sleepMs: async () => {} },
      profile,
      { briefingId },
    );

    // email chegou ao owner
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.to).toBe(`deliv-${runId}@test.local`);

    // destino verificado: msg1 + msg2, ambas ≤ 1500
    const toVerified = whatsapp.sent.filter((s) => s.phone === "5585900000001");
    expect(toVerified).toHaveLength(2);
    for (const s of toVerified) expect(s.message.length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
    expect(toVerified[0]!.message).toContain("🔥 *Must-read*");
    expect(toVerified[1]!.message).toContain("📱 *Posts sugeridos*");

    // NÃO VERIFICADO É RECUSADO: fake nunca chamado com o grupo
    expect(whatsapp.sent.some((s) => s.phone.endsWith("-group"))).toBe(false);
    const { data: skipped } = await admin
      .from("delivery_log")
      .select("*")
      .eq("briefing_id", briefingId)
      .eq("destination", "120363000000000042-group")
      .single();
    expect(skipped!.status).toBe("skipped_unverified");

    expect(log).toContain("skipped_unverified");

    // mensagens persistidas no briefing (auditoria)
    const { data: b } = await admin
      .from("briefings")
      .select("whatsapp_msg_1, whatsapp_msg_2, notas")
      .eq("id", briefingId)
      .single();
    expect(b!.whatsapp_msg_1).toContain("Must-read");
    expect((b!.notas as { entrega: { email: string } }).entrega.email).toBe("sent");
  });

  it("retry não duplica: segunda entrega não reenvia nada (idempotência)", async () => {
    const before = { email: email.sent.length, whatsapp: whatsapp.sent.length };
    await deliverBriefing(
      { db: admin, email, whatsapp, sleepMs: async () => {} },
      {
        id: profileId,
        accountId,
        themes: [],
        excludedThemes: [],
        windowHours: 48,
        maxPostsPerDay: 3,
        timezone: "America/Sao_Paulo",
        channels: { email: true, whatsapp: true },
        voiceOverrides: null,
      },
      { briefingId },
    );
    expect(email.sent.length).toBe(before.email);
    expect(whatsapp.sent.length).toBe(before.whatsapp);
  });
});
