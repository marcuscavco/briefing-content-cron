import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmbeddingProvider } from "./providers/embeddings";
import type { LlmProvider } from "./providers/llm";
import { parseJson } from "./providers/llm";
import { NOVELTY_SCHEMA, NOVELTY_SYSTEM } from "./prompts";
import type { MemoryDecision, RawCluster, StageMetrics } from "./types";

/**
 * Memória entre briefings (dor nº 1 do brief — feature central da Fase 2).
 * Para cada cluster candidato:
 *   1. embedding(titulo + resumo) → match_topic_memory (pgvector, janela configurável)
 *   2. hash idêntico OU similaridade ≥ HIGH sem novidade material (judge Haiku) → suprimir
 *   3. similaridade ≥ JUDGE com novidade material → "Atualização" (o que mudou + link anterior)
 *   4. sem match → novo
 * Depois do briefing persistido, upsert em topic_memory (timeline do assunto).
 */

const SIM_JUDGE_THRESHOLD = 0.8; // abaixo disso: assunto novo
const MEMORY_WINDOW_DAYS_DEFAULT = 90;

export interface MemoryMatchResult {
  decision: MemoryDecision;
  updateResumo: string | null;
  topicMemoryId: string | null;
  previousBriefingId: string | null;
  similarity: number | null;
}

interface TopicMatch {
  id: string;
  canonical_title: string;
  summary: string | null;
  last_briefing_id: string | null;
  last_seen_at: string;
  appearances: number;
  similarity: number;
}

/**
 * Hash de dedupe EXATO. Inclui o resumo de propósito: uma "Atualização" mantém
 * o título canônico do assunto mas muda o resumo — hash igual só quando é o
 * mesmíssimo conteúdo (aí suprime sem gastar judge). Diferença semântica fina
 * fica com o caminho embedding + judge.
 */
export function contentHash(
  cluster: Pick<RawCluster, "titulo" | "resumo" | "entidades">,
): string {
  const normalized = [
    cluster.titulo.toLowerCase().trim(),
    cluster.resumo.toLowerCase().trim(),
    ...cluster.entidades.map((e) => e.toLowerCase().trim()).sort(),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

export class MemoryEngine {
  constructor(
    private readonly db: SupabaseClient,
    private readonly embeddings: EmbeddingProvider,
    private readonly llm: LlmProvider,
    private readonly profileId: string,
    private readonly windowDays = MEMORY_WINDOW_DAYS_DEFAULT,
  ) {}

  /** Texto canônico do cluster para embedding (mesma forma no check e no record). */
  static textOf(cluster: Pick<RawCluster, "titulo" | "resumo">): string {
    return `${cluster.titulo}\n${cluster.resumo}`;
  }

  /**
   * O embedding vem de fora (o pipeline embeda TODOS os clusters numa chamada
   * batch — 1 request por briefing em vez de 1 por cluster).
   */
  async check(
    cluster: RawCluster,
    embedding: number[],
    metrics: StageMetrics,
  ): Promise<MemoryMatchResult & { embedding: number[] }> {
    if (!embedding.length) throw new Error("embedding vazio");

    const { data: matches, error } = await this.db.rpc("match_topic_memory", {
      p_profile_id: this.profileId,
      p_embedding: JSON.stringify(embedding),
      p_threshold: SIM_JUDGE_THRESHOLD,
      p_count: 3,
      p_window_days: this.windowDays,
    });
    if (error) throw new Error(`match_topic_memory falhou: ${error.message}`);

    const top = (matches as TopicMatch[] | null)?.[0];
    if (!top) {
      return { decision: "novo", updateResumo: null, topicMemoryId: null, previousBriefingId: null, similarity: null, embedding };
    }

    // Hash idêntico = mesmíssimo assunto sem nem precisar de judge
    const { data: hashHit } = await this.db
      .from("topic_memory")
      .select("id")
      .eq("profile_id", this.profileId)
      .eq("content_hash", contentHash(cluster))
      .limit(1)
      .maybeSingle();

    if (hashHit) {
      return {
        decision: "suprimir",
        updateResumo: null,
        topicMemoryId: top.id,
        previousBriefingId: top.last_briefing_id,
        similarity: top.similarity,
        embedding,
      };
    }

    // Alta similaridade: LLM barato julga se há novidade material
    const result = await this.llm.complete({
      task: "cheap",
      system: NOVELTY_SYSTEM,
      user: `ASSUNTO JÁ ENTREGUE (${new Date(top.last_seen_at).toISOString().slice(0, 10)}, ${top.appearances}ª aparição):\nTítulo: ${top.canonical_title}\nResumo: ${top.summary ?? "—"}\n\nNOTÍCIA DE HOJE:\nTítulo: ${cluster.titulo}\nResumo: ${cluster.resumo}`,
      maxTokens: 300,
      jsonSchema: NOVELTY_SCHEMA as unknown as Record<string, unknown>,
    });
    metrics.tokensInput += result.usage.inputTokens;
    metrics.tokensOutput += result.usage.outputTokens;
    metrics.costUsd += result.usage.costUsd;

    const verdict = parseJson<{ ha_novidade: boolean; o_que_mudou: string | null }>(result.text);

    if (!verdict.ha_novidade) {
      return {
        decision: "suprimir",
        updateResumo: null,
        topicMemoryId: top.id,
        previousBriefingId: top.last_briefing_id,
        similarity: top.similarity,
        embedding,
      };
    }

    return {
      decision: "atualizacao",
      updateResumo: verdict.o_que_mudou,
      topicMemoryId: top.id,
      previousBriefingId: top.last_briefing_id,
      similarity: top.similarity,
      embedding,
    };
  }

  /** Após persistir o briefing: grava/atualiza a linha do assunto na memória. */
  async record(
    cluster: RawCluster,
    embedding: number[],
    accountId: string,
    briefingId: string,
    existingTopicId: string | null,
  ): Promise<string> {
    const now = new Date().toISOString();
    if (existingTopicId) {
      const { data: current } = await this.db
        .from("topic_memory")
        .select("appearances")
        .eq("id", existingTopicId)
        .single();
      await this.db
        .from("topic_memory")
        .update({
          canonical_title: cluster.titulo,
          summary: cluster.resumo,
          entities: cluster.entidades,
          content_hash: contentHash(cluster),
          embedding: JSON.stringify(embedding),
          appearances: (current?.appearances ?? 1) + 1,
          last_briefing_id: briefingId,
          last_seen_at: now,
        })
        .eq("id", existingTopicId);
      return existingTopicId;
    }

    const { data, error } = await this.db
      .from("topic_memory")
      .insert({
        account_id: accountId,
        profile_id: this.profileId,
        canonical_title: cluster.titulo,
        summary: cluster.resumo,
        entities: cluster.entidades,
        content_hash: contentHash(cluster),
        embedding: JSON.stringify(embedding),
        first_briefing_id: briefingId,
        last_briefing_id: briefingId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`topic_memory insert falhou: ${error.message}`);
    return data.id;
  }
}
