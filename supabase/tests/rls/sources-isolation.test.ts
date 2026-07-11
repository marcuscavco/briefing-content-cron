import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient, createUserWithSession } from "./helpers";

/** Fase 1: isolamento de briefing_profiles, sources, health e catálogo global. */

const runId = Math.random().toString(36).slice(2, 10);
const PASSWORD = "senha-de-teste-123";

let admin: SupabaseClient;
let userA: User;
let userB: User;
let clientA: SupabaseClient;
let clientB: SupabaseClient;
let accountA: string;
let accountB: string;
let profileA: string;
let profileB: string;
let sourceA: string;

async function tenantOf(user: User) {
  const { data: m } = await admin
    .from("memberships")
    .select("account_id")
    .eq("user_id", user.id)
    .single();
  const { data: p } = await admin
    .from("briefing_profiles")
    .select("id")
    .eq("account_id", m!.account_id)
    .single();
  return { accountId: m!.account_id as string, profileId: p!.id as string };
}

beforeAll(async () => {
  admin = adminClient();
  ({ user: userA, client: clientA } = await createUserWithSession(
    admin,
    `src-a-${runId}@test.local`,
    PASSWORD,
  ));
  ({ user: userB, client: clientB } = await createUserWithSession(
    admin,
    `src-b-${runId}@test.local`,
    PASSWORD,
  ));
  ({ accountId: accountA, profileId: profileA } = await tenantOf(userA));
  ({ accountId: accountB, profileId: profileB } = await tenantOf(userB));

  const { data: src, error } = await clientA
    .from("sources")
    .insert({
      account_id: accountA,
      profile_id: profileA,
      name: "Fonte A",
      type: "rss",
      url: `https://a-${runId}.test`,
      feed_url: `https://a-${runId}.test/feed`,
      tier: 2,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert source A falhou: ${error.message}`);
  sourceA = src.id;
});

afterAll(async () => {
  for (const u of [userA, userB]) {
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
  for (const acc of [accountA, accountB]) {
    if (acc) await admin.from("accounts").delete().eq("id", acc);
  }
});

describe("briefing_profiles", () => {
  it("trigger criou 1 profile default por account", async () => {
    expect(profileA).toBeTruthy();
    expect(profileB).toBeTruthy();
    expect(profileA).not.toEqual(profileB);
  });

  it("usuário só vê o próprio profile", async () => {
    const { data } = await clientA.from("briefing_profiles").select("id");
    expect(data?.map((p) => p.id)).toEqual([profileA]);
  });

  it("update de temas no profile do outro não afeta linhas", async () => {
    const { data } = await clientA
      .from("briefing_profiles")
      .update({ themes: ["hacked"] })
      .eq("id", profileB)
      .select();
    expect(data).toEqual([]);
  });

  it("update de temas no próprio profile funciona", async () => {
    const { data, error } = await clientA
      .from("briefing_profiles")
      .update({ themes: ["ia", "saas"] })
      .eq("id", profileA)
      .select("themes")
      .single();
    expect(error).toBeNull();
    expect(data?.themes).toEqual(["ia", "saas"]);
  });
});

describe("sources + health", () => {
  it("B não vê a fonte de A", async () => {
    const { data } = await clientB.from("sources").select("id");
    expect(data).toEqual([]);
  });

  it("B não consegue inserir fonte na account de A", async () => {
    const { error } = await clientB.from("sources").insert({
      account_id: accountA,
      profile_id: profileA,
      name: "Invasora",
      type: "rss",
      url: `https://evil-${runId}.test`,
      feed_url: `https://evil-${runId}.test/feed`,
      tier: 2,
    });
    expect(error).not.toBeNull();
  });

  it("B não consegue apagar nem atualizar a fonte de A", async () => {
    const { data: upd } = await clientB
      .from("sources")
      .update({ name: "hacked" })
      .eq("id", sourceA)
      .select();
    expect(upd).toEqual([]);
    const { data: del } = await clientB.from("sources").delete().eq("id", sourceA).select();
    expect(del).toEqual([]);
    const { data: check } = await admin.from("sources").select("name").eq("id", sourceA).single();
    expect(check?.name).toBe("Fonte A");
  });

  it("health events são isolados por account", async () => {
    const { error } = await clientA.from("source_health_events").insert({
      source_id: sourceA,
      account_id: accountA,
      status: "ok",
      items_found: 3,
    });
    expect(error).toBeNull();

    const { data: bSees } = await clientB.from("source_health_events").select("id");
    expect(bSees).toEqual([]);

    const { error: cross } = await clientB.from("source_health_events").insert({
      source_id: sourceA,
      account_id: accountA,
      status: "error",
    });
    expect(cross).not.toBeNull();
  });
});

describe("suggested_sources (catálogo global)", () => {
  it("qualquer autenticado lê o catálogo", async () => {
    const { data, error } = await clientA.from("suggested_sources").select("name").limit(5);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("usuário não escreve no catálogo", async () => {
    const { error } = await clientA.from("suggested_sources").insert({
      name: "Hack",
      url: `https://hack-${runId}.test`,
      suggested_tier: 1,
      category: "geral",
    });
    expect(error).not.toBeNull();
  });
});
