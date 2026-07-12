import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  FakeLlmProvider,
  HashEmbeddingProvider,
  runStage,
  type CollectedItem,
  type JobRow,
  type PipelineCheckpoint,
  type PipelineDeps,
} from "@briefing/curation";
import { adminClient, createUserWithSession } from "../rls/helpers";

/**
 * ACEITE DA FASE 2 (brief §13): "dois dias seguidos não repetem assunto sem
 * novidade; assunto com novidade entra como 'Atualização' com o que mudou".
 * Roda o pipeline real (estágios cluster→…→report) contra o stack local, com
 * LLM fake determinístico e embeddings hash — a mecânica toda é real:
 * pgvector match, judge, categorização, persistência e timeline.
 */

const runId = Math.random().toString(36).slice(2, 10);

let admin: SupabaseClient;
let user: User;
let accountId: string;
let profileId: string;

// O mesmo assunto nos 3 dias, com wording quase idêntico (similaridade lexical
// alta o suficiente para o HashEmbeddingProvider casar ≥ 0.8, como o Voyage
// casaria semanticamente em produção).
const TITULO_BASE = "Anthropic lança modelo Claude com janela de contexto de 10 milhões";

function makeItems(day: number, extra = ""): CollectedItem[] {
  return [
    {
      sourceId: "s1",
      portal: "The Information",
      tier: 1,
      title: `${TITULO_BASE}${extra}`,
      url: `https://ti.test/claude-${day}`,
      publishedAt: `2026-07-0${day}T09:00:00Z`,
      summary: `A Anthropic anunciou o novo modelo Claude com janela de contexto de 10 milhões de tokens.${extra}`,
    },
    {
      sourceId: "s2",
      portal: "TechCrunch",
      tier: 2,
      title: `${TITULO_BASE} — cobertura${extra}`,
      url: `https://tc.test/claude-${day}`,
      publishedAt: `2026-07-0${day}T10:00:00Z`,
      summary: `Novo Claude da Anthropic amplia a janela de contexto.${extra}`,
    },
    {
      sourceId: "s3",
      portal: "Tecnoblog",
      tier: 2,
      title: `${TITULO_BASE} no Brasil${extra}`,
      url: `https://tb.test/claude-${day}`,
      publishedAt: `2026-07-0${day}T11:00:00Z`,
      summary: `Modelo Claude com contexto de 10 milhões chega ao mercado.${extra}`,
    },
  ];
}

// LLM fake: clusterização agrupa tudo num cluster (💼2 💻3); judge de novidade
// decide pelo marcador "NOVO FATO" no conteúdo do dia; posts sugere 1 post.
const fakeLlm = new FakeLlmProvider((req) => {
  if (req.system.includes("motor de curadoria")) {
    const indices = [...req.user.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
    return JSON.stringify({
      clusters: [
        {
          titulo: TITULO_BASE,
          resumo: req.user.includes("NOVO FATO")
            ? "Anthropic libera o modelo com preço 50% menor que a geração anterior."
            : "Anthropic anuncia modelo Claude com janela de 10M tokens.",
          entidades: ["Anthropic", "Claude"],
          item_indices: indices,
          relevancia_tema: 3,
          impacto_geral: 2,
          angulo_pratico_claro: true,
          data_evento: "2026-07-01",
        },
      ],
    });
  }
  if (req.system.includes("NOVIDADE MATERIAL")) {
    const haNovidade = req.user.includes("50% menor");
    return JSON.stringify({
      ha_novidade: haNovidade,
      o_que_mudou: haNovidade ? "Preço anunciado: 50% menor que a geração anterior." : null,
    });
  }
  // posts
  return JSON.stringify({
    posts: [
      {
        cluster_index: 0,
        skip: false,
        skip_motivo: null,
        formato: "Carrossel",
        justificativa_formato: "análise estruturada",
        gancho: "Seu time ganhou contexto de 10 milhões de tokens de graça.",
        estrutura: [
          { slide: 1, texto: "O anúncio" },
          { slide: 2, texto: "O que muda" },
          { slide: 3, texto: "CTA" },
        ],
        cta: "Salva esse post.",
        angulo_tipo: "traducao_empresario",
        angulo_descricao: "o que 10M de contexto significa para quem decide",
      },
    ],
  });
});

async function runPipelineDay(day: number, items: CollectedItem[]): Promise<string> {
  const runDate = `2026-07-0${day}`;
  const { data: jobRow, error } = await admin
    .from("jobs")
    .insert({
      account_id: accountId,
      profile_id: profileId,
      run_date: runDate,
      stage: "cluster", // pula collect: itens injetados (coleta é testada na F1)
      checkpoint: { items, sourceReport: [] } satisfies PipelineCheckpoint,
      status: "running",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const deps: PipelineDeps = {
    db: admin,
    llm: fakeLlm,
    embeddings: new HashEmbeddingProvider(),
  };

  let job: JobRow = jobRow as unknown as JobRow;
  for (let i = 0; i < 10; i++) {
    const result = await runStage(job, deps);
    job = { ...job, stage: result.nextStage, checkpoint: result.checkpoint };
    if (result.nextStage === "done") break;
  }

  await admin.from("jobs").update({ status: "done", stage: "done" }).eq("id", job.id);
  return job.checkpoint.briefingId!;
}

beforeAll(async () => {
  admin = adminClient();
  ({ user } = await createUserWithSession(admin, `mem-${runId}@test.local`, "senha-teste-123"));
  const { data: m } = await admin
    .from("memberships")
    .select("account_id")
    .eq("user_id", user.id)
    .single();
  accountId = m!.account_id;
  const { data: p } = await admin
    .from("briefing_profiles")
    .select("id")
    .eq("account_id", accountId)
    .single();
  profileId = p!.id;
});

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
  if (accountId) await admin.from("accounts").delete().eq("id", accountId);
});

describe("memória entre briefings (aceite Fase 2)", () => {
  let briefing1: string;
  let briefing3: string;

  it("dia 1: assunto novo entra no digest e vira memória", async () => {
    briefing1 = await runPipelineDay(1, makeItems(1));

    const { data: clusters } = await admin
      .from("clusters")
      .select("*")
      .eq("briefing_id", briefing1);
    expect(clusters).toHaveLength(1);
    const c = clusters![0]!;
    // 3 portais: T1(+2) + T2(+1) + T2(+1) = 4 → relevante… promovido a must_read
    // pelo Curator's Pick (💻3 + ângulo prático claro + 💼2 — regra do SKILL.md)
    expect(c.heat_score).toBe(4);
    expect(c.categoria).toBe("must_read");
    expect(c.is_curator_pick).toBe(true);
    expect(c.curator_pick_motivo).toContain("💻≥3");
    expect(c.is_update).toBe(false);
    expect(c.fonte).toBe("The Information");
    expect(c.tier_fonte).toBe(1);
    // assunto novo: sem boost de recorrência
    expect(c.heat_boost).toBe(0);
    expect(c.em_alta).toBe(false);
    // notícias do assunto persistidas com tier (para o render filtrar links)
    const noticias = c.itens as { portal: string; tier: number }[];
    expect(noticias).toHaveLength(3);
    expect(noticias[0]!.tier).toBe(1);

    const { data: memory } = await admin
      .from("topic_memory")
      .select("*")
      .eq("profile_id", profileId);
    expect(memory).toHaveLength(1);
    expect(memory![0]!.appearances).toBe(1);
    expect(memory![0]!.novelty_streak).toBe(1);
    expect(memory![0]!.stale_days).toBe(0);

    const { data: posts } = await admin.from("posts").select("*").eq("briefing_id", briefing1);
    expect(posts!.filter((p) => !p.skip)).toHaveLength(1);
  });

  it("dia 2: mesmo assunto SEM novidade é suprimido (não repete)", async () => {
    const briefing2 = await runPipelineDay(2, makeItems(2));

    const { data: clusters } = await admin
      .from("clusters")
      .select("*")
      .eq("briefing_id", briefing2);
    expect(clusters).toHaveLength(1);
    expect(clusters![0]!.categoria).toBe("suprimido");

    const { data: b } = await admin.from("briefings").select("*").eq("id", briefing2).single();
    expect(b!.n_suppressed).toBe(1);
    expect(b!.n_relevante).toBe(0);
    expect(b!.n_must_read).toBe(0);

    // supressão acumula decaimento: +1 aparição e +1 stale_day, mas o conteúdo
    // canônico (e o last_briefing_id) continuam os da última novidade
    const { data: memory } = await admin
      .from("topic_memory")
      .select("appearances, last_briefing_id, novelty_streak, stale_days")
      .eq("profile_id", profileId)
      .single();
    expect(memory!.appearances).toBe(2);
    expect(memory!.stale_days).toBe(1);
    expect(memory!.novelty_streak).toBe(1);
    expect(memory!.last_briefing_id).toBe(briefing1);
  });

  it("dia 3: assunto COM novidade entra como Atualização com o que mudou", async () => {
    briefing3 = await runPipelineDay(3, makeItems(3, " NOVO FATO: preço 50% menor"));

    const { data: clusters } = await admin
      .from("clusters")
      .select("*")
      .eq("briefing_id", briefing3);
    expect(clusters).toHaveLength(1);
    const c = clusters![0]!;
    expect(c.categoria).toBe("must_read"); // relevante + Curator's Pick (💻3+prático+💼2)
    expect(c.is_update).toBe(true);
    expect(c.update_resumo).toContain("50% menor");
    // linka o briefing onde o assunto apareceu pela última vez (dia 1)
    expect(c.previous_briefing_id).toBe(briefing1);
    // Em alta: reapareceu COM novidade → boost = base(+2) − 1 dia requentado = +1
    // ("volta mais frio" que uma atualização sem supressão no meio)
    expect(c.heat_boost).toBe(1);
    expect(c.heat_score).toBe(5); // 4 de convergência + 1 de recorrência
    expect(c.em_alta).toBe(true);

    const { data: b } = await admin.from("briefings").select("*").eq("id", briefing3).single();
    expect(b!.n_updates).toBe(1);
  });

  it("timeline do assunto: 3 aparições e tendência avançada na memória", async () => {
    const { data: memory } = await admin
      .from("topic_memory")
      .select("*")
      .eq("profile_id", profileId);
    expect(memory).toHaveLength(1);
    const m = memory![0]!;
    expect(m.appearances).toBe(3); // dia 1 novo + dia 2 suprimido + dia 3 atualização
    expect(m.first_briefing_id).toBe(briefing1);
    expect(m.last_briefing_id).toBe(briefing3);
    // a atualização do dia 3 avança o streak, zera o decaimento e audita o boost
    expect(m.novelty_streak).toBe(2);
    expect(m.stale_days).toBe(0);
    expect(m.trend_score).toBe(1);
  });
});
