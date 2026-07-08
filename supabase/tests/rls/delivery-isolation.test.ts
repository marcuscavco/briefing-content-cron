import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient, createUserWithSession } from "./helpers";

/** Fase 3: isolamento de whatsapp_destinations/delivery_log + anti auto-verificação. */

const runId = Math.random().toString(36).slice(2, 10);
const PASSWORD = "senha-teste-123";

let admin: SupabaseClient;
let userA: User;
let userB: User;
let clientA: SupabaseClient;
let clientB: SupabaseClient;
let accountA: string;
let profileA: string;
let destA: string;

beforeAll(async () => {
  admin = adminClient();
  ({ user: userA, client: clientA } = await createUserWithSession(admin, `dst-a-${runId}@test.local`, PASSWORD));
  ({ user: userB, client: clientB } = await createUserWithSession(admin, `dst-b-${runId}@test.local`, PASSWORD));
  const { data: mA } = await admin.from("memberships").select("account_id").eq("user_id", userA.id).single();
  accountA = mA!.account_id;
  const { data: pA } = await admin.from("briefing_profiles").select("id").eq("account_id", accountA).single();
  profileA = pA!.id;

  const { data: dest, error } = await clientA
    .from("whatsapp_destinations")
    .insert({
      account_id: accountA,
      profile_id: profileA,
      kind: "personal",
      phone: "5585911111111",
      label: "meu número",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  destA = dest.id;
});

afterAll(async () => {
  for (const u of [userA, userB]) if (u) await admin.auth.admin.deleteUser(u.id);
  if (accountA) await admin.from("accounts").delete().eq("id", accountA);
  const { data: mB } = userB
    ? await admin.from("memberships").select("account_id").eq("user_id", userB.id).maybeSingle()
    : { data: null };
  if (mB) await admin.from("accounts").delete().eq("id", mB.account_id);
});

describe("whatsapp_destinations", () => {
  it("B não vê nem altera os destinos de A", async () => {
    const { data: bSees } = await clientB.from("whatsapp_destinations").select("id");
    expect(bSees).toEqual([]);
    const { data: upd } = await clientB
      .from("whatsapp_destinations")
      .update({ label: "hacked" })
      .eq("id", destA)
      .select();
    expect(upd).toEqual([]);
  });

  it("usuário NÃO consegue se auto-verificar (trigger bloqueia)", async () => {
    const { error } = await clientA
      .from("whatsapp_destinations")
      .update({ verified: true })
      .eq("id", destA);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("verificação");

    const { data: check } = await admin
      .from("whatsapp_destinations")
      .select("verified")
      .eq("id", destA)
      .single();
    expect(check!.verified).toBe(false);
  });

  it("usuário não consegue trocar o phone (apaga e recria)", async () => {
    const { error } = await clientA
      .from("whatsapp_destinations")
      .update({ phone: "5585922222222" })
      .eq("id", destA);
    expect(error).not.toBeNull();
  });

  it("usuário PODE editar label e active", async () => {
    const { error } = await clientA
      .from("whatsapp_destinations")
      .update({ label: "novo apelido", active: false })
      .eq("id", destA);
    expect(error).toBeNull();
  });

  it("insert já-verificado é negado pela policy", async () => {
    const { error } = await clientA.from("whatsapp_destinations").insert({
      account_id: accountA,
      profile_id: profileA,
      kind: "personal",
      phone: "5585933333333",
      verified: true,
    });
    expect(error).not.toBeNull();
  });

  it("formato inválido é rejeitado pelo check", async () => {
    const { error } = await clientA.from("whatsapp_destinations").insert({
      account_id: accountA,
      profile_id: profileA,
      kind: "group",
      phone: "120363000@g.us", // formato proibido — pegadinha do legado
    });
    expect(error).not.toBeNull();
  });
});

describe("delivery_log", () => {
  it("é somente-leitura para o usuário e isolado por account", async () => {
    const { error: writeError } = await clientA.from("delivery_log").insert({
      account_id: accountA,
      briefing_id: "00000000-0000-0000-0000-000000000000",
      channel: "email",
      destination: "x@y.z",
      status: "sent",
    });
    expect(writeError).not.toBeNull(); // sem grant de insert

    const { data: bSees } = await clientB.from("delivery_log").select("id");
    expect(bSees).toEqual([]);
  });
});
