import "server-only";
import {
  ClaudeLlmProvider,
  HashEmbeddingProvider,
  runStage,
  VoyageEmbeddingProvider,
  type JobRow,
  type PipelineDeps,
} from "@briefing/curation";
import { createAdminClient } from "@briefing/db/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Worker do motor de curadoria (ADR: Vercel Cron + Fluid Compute).
 * O tick: 1) devolve à fila jobs stale; 2) enfileira profiles devidos;
 * 3) processa jobs com claim atômico, estágio a estágio, até o orçamento
 * de tempo. O estado vive em `jobs` — o engine é substituível.
 */

const STAGE_TIME_BUDGET_MS = 600_000; // ~10min de trabalho por invocação (teto 800s)

function buildDeps(db: SupabaseClient): PipelineDeps {
  return {
    db,
    llm: new ClaudeLlmProvider(),
    embeddings: process.env.VOYAGE_API_KEY
      ? new VoyageEmbeddingProvider()
      : new HashEmbeddingProvider(), // dev sem key: mecânica funciona, semântica é lexical
  };
}

/** Data local (AAAA-MM-DD) e minutos desde meia-noite num timezone IANA. */
function localClock(timezone: string, now = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Enfileira o job diário dos profiles cujo horário de entrega já passou hoje. */
export async function dispatchDueJobs(db: SupabaseClient): Promise<number> {
  const { data: profiles, error } = await db
    .from("briefing_profiles")
    .select("id, account_id, delivery_time, timezone, active")
    .eq("active", true);
  if (error) throw new Error(`profiles: ${error.message}`);

  let enqueued = 0;
  for (const profile of profiles ?? []) {
    const { date, minutes } = localClock(profile.timezone ?? "America/Sao_Paulo");
    const [h = "7", m = "0"] = String(profile.delivery_time ?? "07:00").split(":");
    const deliveryMinutes = Number(h) * 60 + Number(m);
    if (minutes < deliveryMinutes) continue; // ainda não é hora no fuso do usuário

    // unique (profile, type, run_date) faz a idempotência; conflito = já enfileirado
    const { error: insertError } = await db.from("jobs").insert({
      account_id: profile.account_id,
      profile_id: profile.id,
      type: "daily_briefing",
      run_date: date,
    });
    if (!insertError) enqueued++;
    else if (insertError.code !== "23505") {
      console.error(`enqueue ${profile.id}: ${insertError.message}`);
    }
  }
  return enqueued;
}

interface ProcessSummary {
  processed: string[];
  failed: string[];
}

/** Processa jobs da fila (claim → estágios → checkpoint) até o orçamento acabar. */
export async function processQueue(
  db: SupabaseClient,
  workerId: string,
  budgetMs = STAGE_TIME_BUDGET_MS,
): Promise<ProcessSummary> {
  const deps = buildDeps(db);
  const started = Date.now();
  const summary: ProcessSummary = { processed: [], failed: [] };

  while (Date.now() - started < budgetMs) {
    const { data: claimed, error } = await db.rpc("claim_next_job", { p_worker: workerId });
    if (error) throw new Error(`claim_next_job: ${error.message}`);
    const job = (claimed as JobRow[] | null)?.[0];
    if (!job) break; // fila vazia

    const outcome = await runJob(db, deps, job, budgetMs - (Date.now() - started));
    summary[outcome === "failed" ? "failed" : "processed"].push(job.id);
  }

  return summary;
}

async function runJob(
  db: SupabaseClient,
  deps: PipelineDeps,
  initial: JobRow,
  budgetMs: number,
): Promise<"done" | "requeued" | "failed"> {
  let job = initial;
  const started = Date.now();

  while (true) {
    try {
      const result = await runStage(job, deps);
      const stageLogEntry = {
        stage: job.stage,
        ms: Date.now() - started,
        tokens_in: result.metrics.tokensInput,
        tokens_out: result.metrics.tokensOutput,
        log: result.log,
      };

      const done = result.nextStage === "done";
      const { data: updated, error } = await db
        .from("jobs")
        .update({
          stage: done ? job.stage : result.nextStage,
          checkpoint: result.checkpoint,
          status: done ? "done" : "running",
          finished_at: done ? new Date().toISOString() : null,
        })
        .eq("id", job.id)
        .select("*")
        .single();
      if (error) throw new Error(`job update: ${error.message}`);

      await appendStageLog(db, job.id, stageLogEntry);
      await incrementUsage(db, job.id, result.metrics);

      if (done) return "done";
      job = updated as unknown as JobRow;

      if (Date.now() - started > budgetMs) {
        // devolve à fila com checkpoint salvo — próximo tick retoma do estágio
        await db
          .from("jobs")
          .update({ status: "queued", locked_at: null, locked_by: null })
          .eq("id", job.id);
        return "requeued";
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const exhausted = job.attempts >= 3;
      await db
        .from("jobs")
        .update({
          status: exhausted ? "failed" : "queued",
          error: message,
          locked_at: null,
          locked_by: null,
          run_at: exhausted ? undefined : new Date(Date.now() + 5 * 60_000).toISOString(),
        })
        .eq("id", job.id);
      return exhausted ? "failed" : "requeued";
    }
  }
}

async function appendStageLog(db: SupabaseClient, jobId: string, entry: unknown) {
  const { data } = await db.from("jobs").select("stage_log").eq("id", jobId).single();
  const log = Array.isArray(data?.stage_log) ? data.stage_log : [];
  await db.from("jobs").update({ stage_log: [...log, entry] }).eq("id", jobId);
}

async function incrementUsage(
  db: SupabaseClient,
  jobId: string,
  metrics: { tokensInput: number; tokensOutput: number; costUsd: number },
) {
  if (!metrics.tokensInput && !metrics.tokensOutput) return;
  const { data } = await db
    .from("jobs")
    .select("tokens_input, tokens_output, cost_usd")
    .eq("id", jobId)
    .single();
  if (!data) return;
  await db
    .from("jobs")
    .update({
      tokens_input: Number(data.tokens_input) + metrics.tokensInput,
      tokens_output: Number(data.tokens_output) + metrics.tokensOutput,
      cost_usd: Number(data.cost_usd) + metrics.costUsd,
    })
    .eq("id", jobId);
}

/** Tick completo: requeue de stale + dispatch + processamento. */
export async function tick(workerId: string) {
  const db = createAdminClient();
  const { data: requeued } = await db.rpc("requeue_stale_jobs");
  const enqueued = await dispatchDueJobs(db);
  const summary = await processQueue(db, workerId);
  return { requeued: requeued ?? 0, enqueued, ...summary };
}
