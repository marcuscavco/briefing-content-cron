import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  FakeLlmProvider,
  HashEmbeddingProvider,
  runStage,
  type JobRow,
  type PipelineDeps,
} from "@briefing/curation";
import type { InstagramFetcher } from "@briefing/ingestion";
import { adminClient, createUserWithSession } from "../rls/helpers";

/**
 * ACEITE DA FASE 5 (brief §13): "handle do IG vira fonte normalizada;
 * kill-switch funciona". Roda o estágio collect real contra o stack local com
 * fetcher fake — o gating (kill-switch global + feature do plano) é o de
 * produção.
 */

const runId = Math.random().toString(36).slice(2, 10);

let admin: SupabaseClient;
let user: User;
let accountId: string;
let profileId: string;
let sourceId: string;

class FakeFetcher implements InstagramFetcher {
  calls = 0;
  async fetchRecentPosts() {
    this.calls++;
    return [
      {
        url: "https://www.instagram.com/p/DEMO123/",
        caption: "IA no varejo: 3 usos práticos\nDetalhes no carrossel.",
        timestamp: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      },
    ];
  }
}

function makeDeps(fetcher: InstagramFetcher): PipelineDeps {
  return {
    db: admin,
    llm: new FakeLlmProvider(() => {
      throw new Error("collect não chama LLM");
    }),
    embeddings: new HashEmbeddingProvider(),
    instagramFetcher: fetcher,
  };
}

async function runCollect(deps: PipelineDeps) {
  await admin.from("jobs").delete().eq("profile_id", profileId);
  const { data: jobRow, error } = await admin
    .from("jobs")
    .insert({
      account_id: accountId,
      profile_id: profileId,
      type: "briefing",
      run_date: "2026-07-09",
      status: "running",
      stage: "collect",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return runStage(jobRow as unknown as JobRow, deps);
}

beforeAll(async () => {
  admin = adminClient();
  ({ user } = await createUserWithSession(admin, `ig-${runId}@test.local`, "senha-teste-123"));
  const { data: m } = await admin.from("memberships").select("account_id").eq("user_id", user.id).single();
  accountId = m!.account_id;
  const { data: p } = await admin.from("briefing_profiles").select("id").eq("account_id", accountId).single();
  profileId = p!.id;

  const { data: s } = await admin
    .from("sources")
    .insert({
      account_id: accountId,
      profile_id: profileId,
      name: "@oempresarionerd",
      type: "instagram",
      url: "https://www.instagram.com/oempresarionerd/",
      handle: "oempresarionerd",
      tier: 3,
      active: true,
    })
    .select("id")
    .single();
  sourceId = s!.id;
});

afterAll(async () => {
  await admin.from("app_config").upsert({ key: "instagram_connector_enabled", value: true });
  if (user) await admin.auth.admin.deleteUser(user.id);
  if (accountId) await admin.from("accounts").delete().eq("id", accountId);
});

describe("Instagram (aceite Fase 5)", () => {
  it("KILL-SWITCH: desligado globalmente → fonte bloqueada e provedor NUNCA chamado", async () => {
    await admin.from("app_config").upsert({ key: "instagram_connector_enabled", value: false });
    const fetcher = new FakeFetcher();
    const result = await runCollect(makeDeps(fetcher));

    const igReport = result.checkpoint.sourceReport?.find((r) => r.sourceId === sourceId);
    expect(igReport?.status).toBe("blocked");
    expect(igReport?.error).toContain("kill-switch");
    expect(fetcher.calls).toBe(0);
    expect(result.checkpoint.items).toEqual([]);
  });

  it("FEATURE POR PLANO: ligado mas sem plano com social → bloqueado com mensagem clara", async () => {
    await admin.from("app_config").upsert({ key: "instagram_connector_enabled", value: true });
    const fetcher = new FakeFetcher();
    const result = await runCollect(makeDeps(fetcher));

    const igReport = result.checkpoint.sourceReport?.find((r) => r.sourceId === sourceId);
    expect(igReport?.status).toBe("blocked");
    expect(igReport?.error).toContain("plano");
    expect(fetcher.calls).toBe(0);
  });

  it("HANDLE VIRA FONTE NORMALIZADA: plano pro concedido → legenda/permalink/data no shape padrão", async () => {
    await admin.from("subscriptions").insert({
      account_id: accountId,
      plan_id: "pro",
      source: "admin_grant",
    });
    const fetcher = new FakeFetcher();
    const result = await runCollect(makeDeps(fetcher));

    expect(fetcher.calls).toBe(1);
    const igReport = result.checkpoint.sourceReport?.find((r) => r.sourceId === sourceId);
    expect(igReport?.status).toBe("ok");
    expect(igReport?.itemsFound).toBe(1);

    const item = result.checkpoint.items?.find((i) => i.sourceId === sourceId);
    expect(item).toBeDefined();
    expect(item!.title).toBe("IA no varejo: 3 usos práticos"); // 1ª linha da legenda
    expect(item!.url).toBe("https://www.instagram.com/p/DEMO123/"); // permalink
    expect(item!.summary).toContain("Detalhes no carrossel.");
    expect(item!.tier).toBe(3); // rede social nunca é fonte canônica
    expect(item!.publishedAt).toBeTruthy();

    // health tracking também registrou a coleta ok
    const { data: src } = await admin.from("sources").select("last_status").eq("id", sourceId).single();
    expect(src!.last_status).toBe("ok");
  });
});
