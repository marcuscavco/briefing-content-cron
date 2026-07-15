import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient, createUserWithSession } from "./helpers";

/**
 * Fase 4: aceite "navegação completa read/write com RLS" —
 * subscriptions/plans, busca full-text e timeline (topic_memory) isoladas.
 */

const runId = Math.random().toString(36).slice(2, 10);
const PASSWORD = "senha-teste-123";
const MARKER = `zebraquantica${runId}`; // termo improvável p/ FTS

let admin: SupabaseClient;
let userA: User;
let userB: User;
let clientA: SupabaseClient;
let clientB: SupabaseClient;
let accountA: string;
let profileA: string;
let briefingA: string;
let topicA: string;

beforeAll(async () => {
  admin = adminClient();
  ({ user: userA, client: clientA } = await createUserWithSession(admin, `f4-a-${runId}@test.local`, PASSWORD));
  ({ user: userB, client: clientB } = await createUserWithSession(admin, `f4-b-${runId}@test.local`, PASSWORD));
  const { data: mA } = await admin.from("memberships").select("account_id").eq("user_id", userA.id).single();
  accountA = mA!.account_id;
  const { data: pA } = await admin.from("briefing_profiles").select("id").eq("account_id", accountA).single();
  profileA = pA!.id;

  const { data: b } = await admin
    .from("briefings")
    .insert({ account_id: accountA, profile_id: profileA, run_date: "2026-07-08" })
    .select("id")
    .single();
  briefingA = b!.id;

  const { data: tm } = await admin
    .from("topic_memory")
    .insert({
      account_id: accountA,
      profile_id: profileA,
      canonical_title: `Assunto secreto ${MARKER}`,
      summary: "linha do tempo de A",
      content_hash: `hash-${runId}`,
      embedding: JSON.stringify(new Array(1024).fill(0.01)),
      first_briefing_id: briefingA,
      last_briefing_id: briefingA,
    })
    .select("id")
    .single();
  topicA = tm!.id;

  await admin.from("clusters").insert({
    account_id: accountA,
    briefing_id: briefingA,
    ordem: 1,
    titulo: `Novidade sobre ${MARKER} no mercado`,
    resumo: "Resumo do assunto exclusivo da conta A.",
    categoria: "must_read",
    topic_memory_id: topicA,
  });

  // assinatura concedida por admin à conta A
  await admin.from("subscriptions").insert({
    account_id: accountA,
    plan_id: "pro",
    source: "admin_grant",
  });
});

afterAll(async () => {
  for (const u of [userA, userB]) if (u) await admin.auth.admin.deleteUser(u.id);
  if (accountA) await admin.from("accounts").delete().eq("id", accountA);
  const { data: mB } = userB
    ? await admin.from("memberships").select("account_id").eq("user_id", userB.id).maybeSingle()
    : { data: null };
  if (mB) await admin.from("accounts").delete().eq("id", mB.account_id);
});

describe("plans e subscriptions", () => {
  it("planos ativos são visíveis para qualquer autenticado; escrita é negada", async () => {
    const { data: plansB } = await clientB.from("plans").select("id");
    // Fase 6: 'free' foi desativado (policy só expõe planos ativos)
    const ids = (plansB ?? []).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["essencial", "pro"]));
    expect(ids).not.toContain("free");

    const { error: writeError } = await clientB
      .from("plans")
      .update({ price_cents: 1 })
      .eq("id", "pro");
    expect(writeError).not.toBeNull(); // sem grant de update
  });

  it("A vê a própria assinatura; B não vê nada; ninguém escreve", async () => {
    const { data: subsA } = await clientA.from("subscriptions").select("plan_id, source");
    expect(subsA).toEqual([{ plan_id: "pro", source: "admin_grant" }]);

    const { data: subsB } = await clientB.from("subscriptions").select("id");
    expect(subsB).toEqual([]);

    const { error: insErr } = await clientA.from("subscriptions").insert({
      account_id: accountA,
      plan_id: "pro",
      source: "admin_grant",
    });
    expect(insErr).not.toBeNull(); // grant de insert não existe p/ authenticated
  });
});

describe("busca full-text (clusters.fts)", () => {
  it("A encontra o próprio cluster; B não encontra nada com o mesmo termo", async () => {
    const { data: hitsA, error } = await clientA
      .from("clusters")
      .select("id, titulo")
      .textSearch("fts", MARKER, { type: "websearch", config: "portuguese" });
    expect(error).toBeNull();
    expect(hitsA).toHaveLength(1);
    expect(hitsA![0]!.titulo).toContain(MARKER);

    const { data: hitsB } = await clientB
      .from("clusters")
      .select("id")
      .textSearch("fts", MARKER, { type: "websearch", config: "portuguese" });
    expect(hitsB).toEqual([]);
  });
});

describe("timeline de assunto (topic_memory)", () => {
  it("A lê o próprio tópico; B não; escrita de A é negada", async () => {
    const { data: topicForA } = await clientA
      .from("topic_memory")
      .select("canonical_title")
      .eq("id", topicA)
      .maybeSingle();
    expect(topicForA?.canonical_title).toContain(MARKER);

    const { data: topicForB } = await clientB
      .from("topic_memory")
      .select("id")
      .eq("id", topicA)
      .maybeSingle();
    expect(topicForB).toBeNull();

    const { error: updErr } = await clientA
      .from("topic_memory")
      .update({ summary: "hacked" })
      .eq("id", topicA);
    expect(updErr).not.toBeNull(); // só select foi concedido
  });
});
