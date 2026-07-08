import { decryptCredential, getConnector, type Transport } from "@briefing/ingestion";
import type { SupabaseClient } from "@supabase/supabase-js";
import { categorize, computeHeat, DEFAULT_WEIGHTS } from "./heat";
import { MemoryEngine } from "./memory";
import type { EmbeddingProvider } from "./providers/embeddings";
import { parseJson, type LlmProvider } from "./providers/llm";
import { CLUSTER_SCHEMA, CLUSTER_SYSTEM, POSTS_SCHEMA, POSTS_SYSTEM } from "./prompts";
import { selectSources } from "./select";
import type {
  CollectedItem,
  PipelineCheckpoint,
  PostSuggestion,
  ProcessedCluster,
  ProfileConfig,
  RawCluster,
  SourceRow,
  Stage,
  StageMetrics,
  STAGES,
} from "./types";

/**
 * Pipeline das 9 etapas do SKILL.md, parametrizado por briefing profile e
 * stage-checkpointado (ADR: o engine executa estágios; o estado vive em
 * jobs.checkpoint). Cada estágio é uma função (ctx, checkpoint) → checkpoint'
 * idempotente — o worker pode morrer e retomar do estágio salvo.
 */

export interface JobRow {
  id: string;
  account_id: string;
  profile_id: string;
  run_date: string;
  stage: string;
  checkpoint: PipelineCheckpoint;
  attempts: number;
}

export interface PipelineDeps {
  db: SupabaseClient; // service role — o pipeline roda fora de sessão de usuário
  llm: LlmProvider;
  embeddings: EmbeddingProvider;
  transport?: Transport;
  now?: () => Date;
}

export interface StageResult {
  nextStage: Stage | "done";
  checkpoint: PipelineCheckpoint;
  metrics: StageMetrics;
  log: string;
}

const MAX_ITEMS_FOR_LLM = 220;

export async function runStage(job: JobRow, deps: PipelineDeps): Promise<StageResult> {
  const metrics: StageMetrics = { tokensInput: 0, tokensOutput: 0, costUsd: 0 };
  const checkpoint: PipelineCheckpoint = job.checkpoint ?? {};

  const profile = await loadProfile(deps.db, job.profile_id);

  switch (job.stage as Stage) {
    case "collect": {
      const { items, report } = await collect(deps, profile);
      return {
        nextStage: "cluster",
        checkpoint: { ...checkpoint, items, sourceReport: report },
        metrics,
        log: `coletados ${items.length} itens de ${report.length} fontes`,
      };
    }

    case "cluster": {
      const rawClusters = await cluster(deps.llm, profile, checkpoint.items ?? [], metrics);
      return {
        nextStage: "memory",
        checkpoint: { ...checkpoint, rawClusters },
        metrics,
        log: `${rawClusters.length} clusters`,
      };
    }

    case "memory": {
      const processed = await applyMemoryAndSelect(deps, job, profile, checkpoint, metrics);
      return {
        nextStage: "posts",
        checkpoint: { ...checkpoint, processed },
        metrics,
        log: `${processed.filter((c) => c.memoryDecision === "suprimir").length} suprimidos, ${processed.filter((c) => c.memoryDecision === "atualizacao").length} atualizações`,
      };
    }

    // "select" está fundido em "memory" (a seleção precisa das categorias finais
    // pós-supressão); mantido no enum para clareza do relatório.
    case "select":
      return { nextStage: "posts", checkpoint, metrics, log: "noop (fundido em memory)" };

    case "posts": {
      const posts = await suggestPosts(deps.llm, profile, checkpoint.processed ?? [], metrics);
      return {
        nextStage: "persist",
        checkpoint: { ...checkpoint, posts },
        metrics,
        log: `${posts.filter((p) => !p.skip).length} posts publicáveis, ${posts.filter((p) => p.skip).length} skips`,
      };
    }

    case "persist": {
      const briefingId = await persist(deps, job, profile, checkpoint);
      return {
        nextStage: "deliver",
        checkpoint: { ...checkpoint, briefingId },
        metrics,
        log: `briefing ${briefingId}`,
      };
    }

    case "deliver":
      // Fase 3: email (Resend) + WhatsApp multi-tenant. Por ora o dashboard é o canal.
      return {
        nextStage: "report",
        checkpoint,
        metrics,
        log: "entrega por email/WhatsApp chega na Fase 3 — dashboard disponível",
      };

    case "report": {
      await finalizeReport(deps, job, checkpoint);
      return { nextStage: "done", checkpoint, metrics, log: "relatório consolidado" };
    }

    default:
      throw new Error(`estágio desconhecido: ${job.stage}`);
  }
}

async function loadProfile(db: SupabaseClient, profileId: string): Promise<ProfileConfig> {
  const { data, error } = await db.from("briefing_profiles").select("*").eq("id", profileId).single();
  if (error || !data) throw new Error(`profile ${profileId} não encontrado: ${error?.message}`);
  return {
    id: data.id,
    accountId: data.account_id,
    themes: data.themes ?? [],
    excludedThemes: data.excluded_themes ?? [],
    windowHours: data.window_hours ?? 48,
    maxPostsPerDay: data.max_posts_per_day ?? 3,
    timezone: data.timezone ?? "America/Sao_Paulo",
    voiceOverrides: data.voice_overrides,
  };
}

// ── Etapa 1: coleta via SourceConnectors, com health tracking ────────────────
async function collect(deps: PipelineDeps, profile: ProfileConfig) {
  const { data: sources, error } = await deps.db
    .from("sources")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("active", true);
  if (error) throw new Error(`sources: ${error.message}`);

  const items: CollectedItem[] = [];
  const report: NonNullable<PipelineCheckpoint["sourceReport"]> = [];

  for (const source of (sources ?? []) as (SourceRow & { account_id: string })[]) {
    const connector = getConnector(source.type, deps.transport);
    const result = await connector.collect(
      {
        type: source.type,
        url: source.url,
        feed_url: source.feed_url,
        handle: source.handle,
        credential: source.credential_enc ? await decryptCredential(source.credential_enc) : null,
      },
      { windowHours: profile.windowHours },
    );

    for (const item of result.items) {
      items.push({
        ...item,
        sourceId: source.id,
        portal: source.name,
        tier: source.tier as 1 | 2 | 3,
      });
    }

    report.push({
      sourceId: source.id,
      portal: source.name,
      status: result.status,
      itemsFound: result.items.length,
      error: result.error,
    });

    const now = (deps.now?.() ?? new Date()).toISOString();
    await deps.db
      .from("sources")
      .update({
        last_status: result.status,
        last_error: result.error ?? null,
        last_checked_at: now,
        last_ok_at: result.status === "ok" ? now : undefined,
      })
      .eq("id", source.id);
    await deps.db.from("source_health_events").insert({
      source_id: source.id,
      account_id: source.account_id,
      status: result.status,
      method: result.method,
      latency_ms: result.latencyMs,
      items_found: result.items.length,
      error: result.error ?? null,
    });
  }

  return { items: items.slice(0, MAX_ITEMS_FOR_LLM), report };
}

// ── Etapas 2+5: clusterização + notas dimensionais (uma chamada LLM) ─────────
async function cluster(
  llm: LlmProvider,
  profile: ProfileConfig,
  items: CollectedItem[],
  metrics: StageMetrics,
): Promise<RawCluster[]> {
  if (items.length === 0) return [];

  const itemList = items
    .map(
      (item, i) =>
        `${i}. [${item.portal} T${item.tier}] ${item.title}${item.publishedAt ? ` (${item.publishedAt.slice(0, 10)})` : ""}\n   ${item.summary.slice(0, 280)}`,
    )
    .join("\n");

  const result = await llm.complete({
    task: "heavy",
    system: CLUSTER_SYSTEM,
    user: `TEMAS DE INTERESSE: ${profile.themes.join(", ") || "(todos — usuário não restringiu)"}\nTEMAS EXCLUÍDOS: ${profile.excludedThemes.join(", ") || "(nenhum)"}\n\nITENS (${items.length}):\n${itemList}`,
    maxTokens: 40_000, // adaptive thinking + JSON de ~30 clusters cabem folgados
    jsonSchema: CLUSTER_SCHEMA as unknown as Record<string, unknown>,
  });
  metrics.tokensInput += result.usage.inputTokens;
  metrics.tokensOutput += result.usage.outputTokens;
  metrics.costUsd += result.usage.costUsd;

  const parsed = parseJson<{
    clusters: {
      titulo: string;
      resumo: string;
      entidades: string[];
      item_indices: number[];
      relevancia_tecnica: 0 | 1 | 2 | 3;
      relevancia_empresarial: 0 | 1 | 2 | 3;
      angulo_pratico_claro: boolean;
      data_evento: string | null;
    }[];
  }>(result.text);

  return parsed.clusters
    .map((c) => ({
      titulo: c.titulo,
      resumo: c.resumo,
      entidades: c.entidades,
      itemIndices: c.item_indices.filter((i) => i >= 0 && i < items.length),
      relevanciaTecnica: c.relevancia_tecnica,
      relevanciaEmpresarial: c.relevancia_empresarial,
      anguloPraticoClaro: c.angulo_pratico_claro,
      dataEvento: c.data_evento,
    }))
    .filter((c) => c.itemIndices.length > 0);
}

// ── Etapas 3+4+6.4: heat, memória (novo/atualização/suprimir) e seleção ──────
async function applyMemoryAndSelect(
  deps: PipelineDeps,
  job: JobRow,
  profile: ProfileConfig,
  checkpoint: PipelineCheckpoint,
  metrics: StageMetrics,
): Promise<ProcessedCluster[]> {
  const items = checkpoint.items ?? [];
  const rawClusters = checkpoint.rawClusters ?? [];

  const { data: sources } = await deps.db
    .from("sources")
    .select("*")
    .eq("profile_id", profile.id);
  const sourceRows = (sources ?? []) as SourceRow[];

  const scored = rawClusters.map((cluster) => {
    const { heat, portais } = computeHeat(cluster, items, DEFAULT_WEIGHTS);
    return { cluster, heat, categoria: categorize(heat), portais };
  });

  const selected = selectSources(scored, items, sourceRows);

  const memory = new MemoryEngine(deps.db, deps.embeddings, deps.llm, profile.id);
  const processed: ProcessedCluster[] = [];
  const embeddings: number[][] = [];

  // Embeddings em BATCH: uma chamada por briefing (não uma por cluster) —
  // essencial para caber nos rate limits do provedor.
  const toEmbed = selected.filter((c) => c.categoria !== "descartado");
  const batch = toEmbed.length
    ? await deps.embeddings.embed(toEmbed.map((c) => MemoryEngine.textOf(c)))
    : [];
  const embeddingByCluster = new Map(toEmbed.map((c, i) => [c, batch[i] ?? []]));

  for (const cluster of selected) {
    // Descartado (heat < 2) é salvo para análise, mas não passa pela memória
    if (cluster.categoria === "descartado") {
      processed.push({
        ...cluster,
        memoryDecision: "novo",
        updateResumo: null,
        previousBriefingId: null,
        topicMemoryId: null,
      });
      embeddings.push([]);
      continue;
    }

    const verdict = await memory.check(cluster, embeddingByCluster.get(cluster) ?? [], metrics);
    processed.push({
      ...cluster,
      categoria: verdict.decision === "suprimir" ? "suprimido" : cluster.categoria,
      memoryDecision: verdict.decision,
      updateResumo: verdict.updateResumo,
      previousBriefingId: verdict.previousBriefingId,
      topicMemoryId: verdict.topicMemoryId,
    });
    embeddings.push(verdict.embedding);
  }

  // embeddings ficam no checkpoint só até o persist (não serializar seria refazer)
  (checkpoint as PipelineCheckpoint & { embeddings?: number[][] }).embeddings = embeddings;
  return processed;
}

// ── Etapa 6: sugestões de post ────────────────────────────────────────────────
async function suggestPosts(
  llm: LlmProvider,
  profile: ProfileConfig,
  processed: ProcessedCluster[],
  metrics: StageMetrics,
): Promise<PostSuggestion[]> {
  const eligible = processed
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (c.categoria === "must_read" || c.categoria === "relevante"));
  if (eligible.length === 0) return [];

  const list = eligible
    .map(
      ({ c, i }) =>
        `cluster_index=${i} | 💼${c.relevanciaEmpresarial}/3 💻${c.relevanciaTecnica}/3 heat=${c.heat}${c.memoryDecision === "atualizacao" ? " [ATUALIZAÇÃO]" : ""}\n${c.titulo}\n${c.resumo}`,
    )
    .join("\n\n");

  const result = await llm.complete({
    task: "heavy",
    system: POSTS_SYSTEM,
    user: `LIMITE DE POSTS PUBLICÁVEIS: ${profile.maxPostsPerDay}\n\nCLUSTERS:\n${list}`,
    maxTokens: 12_000,
    jsonSchema: POSTS_SCHEMA as unknown as Record<string, unknown>,
  });
  metrics.tokensInput += result.usage.inputTokens;
  metrics.tokensOutput += result.usage.outputTokens;
  metrics.costUsd += result.usage.costUsd;

  const parsed = parseJson<{
    posts: {
      cluster_index: number;
      skip: boolean;
      skip_motivo: string | null;
      formato: string | null;
      justificativa_formato: string | null;
      gancho: string | null;
      estrutura: { slide: number; texto: string }[] | null;
      cta: string | null;
      angulo_tipo: string | null;
      angulo_descricao: string | null;
    }[];
  }>(result.text);

  // Enforcement em código do "máx N publicáveis" (o LLM é instruído, o código garante)
  let publishable = 0;
  return parsed.posts
    .filter((p) => p.cluster_index >= 0 && p.cluster_index < processed.length)
    .map((p) => {
      let skip = p.skip;
      let skipMotivo = p.skip_motivo;
      if (!skip) {
        publishable++;
        if (publishable > profile.maxPostsPerDay) {
          skip = true;
          skipMotivo = "excede limite diário";
        }
      }
      return {
        clusterIndex: p.cluster_index,
        formato: p.formato ?? "",
        justificativaFormato: p.justificativa_formato ?? "",
        gancho: p.gancho ?? "",
        estrutura: p.estrutura ?? [],
        cta: p.cta ?? "",
        anguloTipo: p.angulo_tipo ?? "",
        anguloDescricao: p.angulo_descricao ?? "",
        skip,
        skipMotivo: skip ? (skipMotivo ?? "skip") : null,
      };
    });
}

// ── Etapa 7: persistência ─────────────────────────────────────────────────────
async function persist(
  deps: PipelineDeps,
  job: JobRow,
  profile: ProfileConfig,
  checkpoint: PipelineCheckpoint,
): Promise<string> {
  const processed = checkpoint.processed ?? [];
  const posts = checkpoint.posts ?? [];
  const embeddings =
    (checkpoint as PipelineCheckpoint & { embeddings?: number[][] }).embeddings ?? [];

  const inDigest = processed.filter((c) =>
    ["must_read", "relevante", "no_radar", "sinal_sem_fonte"].includes(c.categoria),
  );
  const count = (cat: string) => processed.filter((c) => c.categoria === cat).length;

  // Idempotência: se o briefing do dia já existe (retry pós-crash), reusa.
  const { data: existing } = await deps.db
    .from("briefings")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("run_date", job.run_date)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: briefing, error } = await deps.db
    .from("briefings")
    .insert({
      account_id: profile.accountId,
      profile_id: profile.id,
      run_date: job.run_date,
      n_clusters_total: processed.length,
      n_must_read: count("must_read"),
      n_relevante: count("relevante"),
      n_no_radar: count("no_radar"),
      n_sinal_sem_fonte: count("sinal_sem_fonte"),
      n_updates: processed.filter((c) => c.memoryDecision === "atualizacao").length,
      n_suppressed: count("suprimido"),
      n_posts: posts.filter((p) => !p.skip).length,
      n_posts_skipped: posts.filter((p) => p.skip).length,
      notas: { fontes: checkpoint.sourceReport ?? [] },
    })
    .select("id")
    .single();
  if (error) throw new Error(`briefings insert: ${error.message}`);

  const memory = new MemoryEngine(deps.db, deps.embeddings, deps.llm, profile.id);
  const clusterIdByIndex = new Map<number, string>();
  let ordem = 0;

  for (let i = 0; i < processed.length; i++) {
    const c = processed[i]!;
    ordem++;

    // memória: registra novo/atualização (suprimido não re-registra; descartado não entra)
    let topicId = c.topicMemoryId;
    const emb = embeddings[i];
    if (c.categoria !== "descartado" && c.categoria !== "suprimido" && emb && emb.length > 0) {
      topicId = await memory.record(c, emb, profile.accountId, briefing.id, c.topicMemoryId);
    }

    const { data: row, error: clusterError } = await deps.db
      .from("clusters")
      .insert({
        account_id: profile.accountId,
        briefing_id: briefing.id,
        ordem,
        titulo: c.titulo,
        fonte: c.fonte,
        url: c.url,
        data_publicacao: c.dataEvento,
        resumo: c.resumo,
        categoria: c.categoria,
        heat_score: c.heat,
        relevancia_tecnica: c.relevanciaTecnica,
        relevancia_empresarial: c.relevanciaEmpresarial,
        tier_fonte: c.tierFonte,
        is_fallback: c.isFallback,
        is_curator_pick: c.isCuratorPick,
        curator_pick_motivo: c.curatorPickMotivo,
        portais_cobrindo: c.portaisCobrindo,
        itens: c.itemIndices.map((idx) => {
          const item = (checkpoint.items ?? [])[idx];
          return item
            ? { title: item.title, url: item.url, portal: item.portal, publishedAt: item.publishedAt }
            : null;
        }).filter(Boolean),
        is_update: c.memoryDecision === "atualizacao",
        update_resumo: c.updateResumo,
        previous_briefing_id: c.previousBriefingId,
        topic_memory_id: topicId,
      })
      .select("id")
      .single();
    if (clusterError) throw new Error(`clusters insert: ${clusterError.message}`);
    clusterIdByIndex.set(i, row.id);
  }

  let postOrdem = 0;
  for (const p of posts) {
    postOrdem++;
    await deps.db.from("posts").insert({
      account_id: profile.accountId,
      briefing_id: briefing.id,
      cluster_id: clusterIdByIndex.get(p.clusterIndex) ?? null,
      ordem: postOrdem,
      formato: p.formato,
      justificativa_formato: p.justificativaFormato,
      gancho: p.gancho,
      estrutura: p.estrutura,
      cta: p.cta,
      angulo_tipo: p.anguloTipo,
      angulo_descricao: p.anguloDescricao,
      skip: p.skip,
      skip_motivo: p.skipMotivo,
    });
  }

  return briefing.id;
}

// ── Etapa 9: relatório final no job ───────────────────────────────────────────
async function finalizeReport(deps: PipelineDeps, job: JobRow, checkpoint: PipelineCheckpoint) {
  const processed = checkpoint.processed ?? [];
  await deps.db
    .from("jobs")
    .update({
      result: {
        briefing_id: checkpoint.briefingId ?? null,
        clusters: processed.length,
        suprimidos: processed.filter((c) => c.categoria === "suprimido").length,
        atualizacoes: processed.filter((c) => c.memoryDecision === "atualizacao").length,
        posts: (checkpoint.posts ?? []).filter((p) => !p.skip).length,
        fontes_com_erro: (checkpoint.sourceReport ?? []).filter((f) => f.status === "error" || f.status === "blocked").length,
      },
    })
    .eq("id", job.id);
}
