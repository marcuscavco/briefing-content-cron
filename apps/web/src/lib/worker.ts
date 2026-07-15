import "server-only";
import {
  HashEmbeddingProvider,
  isLlmRateLimitError,
  RoutedLlmProvider,
  runStage,
  VoyageEmbeddingProvider,
  type JobRow,
  type PipelineDeps,
} from "@briefing/curation";
import { ResendEmailSender, ZapiClient } from "@briefing/delivery";
import { ApifyInstagramFetcher } from "@briefing/ingestion";
import { createAdminClient } from "@briefing/db/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Worker do motor de curadoria (ADR: cron por minuto via pg_cron + Fluid Compute).
 * O tick: 1) devolve à fila jobs stale; 2) enfileira profiles devidos (com
 * antecedência, para entregar antes do horário); 3) processa até N jobs em
 * paralelo com claim atômico, estágio a estágio, até o orçamento de tempo;
 * 4) avisa usuários de atraso e alerta o operador. O estado vive em `jobs`.
 */

// Orçamento por invocação < maxDuration da rota (300s no Hobby). O pipeline é
// checkpointado por estágio: o que não couber é retomado na próxima invocação.
const STAGE_TIME_BUDGET_MS = Number(process.env.WORKER_BUDGET_MS ?? 240_000);

// Jobs simultâneos por invocação. O tempo é ~todo I/O-wait (RSS + API Claude),
// então N jobs custam quase o mesmo wall-clock de 1. Tier intermediário da
// Anthropic comporta 5 pipelines em paralelo com folga.
const WORKER_CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 5));

// Antecedência do enfileiramento: gerar ANTES do delivery_time para o briefing
// chegar até o horário (ex.: entrega 07:00 → fila às 06:00).
const DISPATCH_LEAD_MINUTES = Math.max(0, Number(process.env.DISPATCH_LEAD_MINUTES ?? 60));

function buildDeps(db: SupabaseClient): PipelineDeps {
  return {
    db,
    // task → provider:modelo por env (LLM_CLUSTER/LLM_POSTS/LLM_CHEAP);
    // defaults = Sonnet 5 (cluster/posts) + Haiku 4.5 (judges)
    llm: new RoutedLlmProvider(),
    embeddings: process.env.VOYAGE_API_KEY
      ? new VoyageEmbeddingProvider()
      : new HashEmbeddingProvider(), // dev sem key: mecânica funciona, semântica é lexical
    // Entrega (Fase 3): sem as envs, o deliver loga skipped_disabled sem quebrar
    email: process.env.RESEND_API_KEY ? new ResendEmailSender() : undefined,
    whatsapp:
      process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN ? new ZapiClient() : undefined,
    appBaseUrl: process.env.APP_BASE_URL ?? "https://briefingnerd.com",
    unsubscribeSecret: process.env.CRON_SECRET,
    // Encurtador bnrd.me nas mensagens de WhatsApp (vazio = URLs longas)
    shortlinkBase: process.env.SHORTLINK_BASE,
    // Instagram (Fase 5): sem token, a fonte IG reporta erro claro na coleta
    instagramFetcher: process.env.APIFY_TOKEN ? new ApifyInstagramFetcher() : undefined,
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

/** Minutos desde meia-noite do delivery_time ("HH:MM" ou "HH:MM:SS"). */
function deliveryMinutesOf(deliveryTime: string | null): number {
  const [h = "7", m = "0"] = String(deliveryTime ?? "07:00").split(":");
  return Number(h) * 60 + Number(m);
}

/** Enfileira o job diário dos profiles com DISPATCH_LEAD_MINUTES de antecedência. */
export async function dispatchDueJobs(db: SupabaseClient): Promise<number> {
  // Só perfis que CONCLUÍRAM o onboarding: com o tick por minuto, um perfil
  // recém-criado (active, mas ainda sem fontes/temas/canais) era enfileirado
  // ~30s após o cadastro e gerava briefing vazio "done" — que depois bloqueava
  // o 1º briefing real do dia (unique profile/type/run_date). O 1º job de quem
  // está no onboarding nasce no finishOnboarding, nunca aqui.
  const { data: profiles, error } = await db
    .from("briefing_profiles")
    .select("id, account_id, delivery_time, timezone, active")
    .eq("active", true)
    .not("onboarded_at", "is", null);
  if (error) throw new Error(`profiles: ${error.message}`);

  // Paywall (Fase 6): briefing diário é só para assinante vigente. O único
  // briefing gratuito é o do onboarding, que nasce no finishOnboarding e não
  // passa por aqui.
  const { data: subs, error: subsError } = await db
    .from("subscriptions")
    .select("account_id")
    .in("status", ["active", "trialing"]);
  if (subsError) throw new Error(`subscriptions: ${subsError.message}`);
  const subscribed = new Set((subs ?? []).map((s) => s.account_id));

  let enqueued = 0;
  for (const profile of profiles ?? []) {
    if (!subscribed.has(profile.account_id)) continue;
    const { date, minutes } = localClock(profile.timezone ?? "America/Sao_Paulo");
    const deliveryMinutes = deliveryMinutesOf(profile.delivery_time);
    // entra na fila LEAD minutos antes da entrega, para chegar até o horário
    if (minutes < deliveryMinutes - DISPATCH_LEAD_MINUTES) continue;

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

/**
 * Processa jobs da fila até o orçamento acabar, mantendo até WORKER_CONCURRENCY
 * pipelines simultâneos. O claim (`FOR UPDATE SKIP LOCKED`) é atômico, então N
 * loops concorrentes nunca pegam o mesmo job.
 */
export async function processQueue(
  db: SupabaseClient,
  workerId: string,
  budgetMs = STAGE_TIME_BUDGET_MS,
): Promise<ProcessSummary> {
  const deps = buildDeps(db);
  const started = Date.now();
  const summary: ProcessSummary = { processed: [], failed: [] };
  const inFlight = new Set<Promise<void>>();
  let queueEmpty = false;

  while (!queueEmpty && Date.now() - started < budgetMs) {
    if (inFlight.size >= WORKER_CONCURRENCY) {
      await Promise.race(inFlight);
      continue;
    }

    const { data: claimed, error } = await db.rpc("claim_next_job", { p_worker: workerId });
    if (error) throw new Error(`claim_next_job: ${error.message}`);
    const job = (claimed as JobRow[] | null)?.[0];
    if (!job) {
      queueEmpty = true; // nada devido agora; drena o que está em voo
      break;
    }

    const task: Promise<void> = runJob(db, deps, job, budgetMs - (Date.now() - started))
      .then((outcome) => {
        summary[outcome === "failed" ? "failed" : "processed"].push(job.id);
      })
      .finally(() => {
        inFlight.delete(task);
      });
    inFlight.add(task);
  }

  await Promise.all(inFlight);
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

      // um único UPDATE atômico: com workers concorrentes, read-modify-write
      // de stage_log/tokens perdia entradas
      await db.rpc("append_job_progress", {
        p_job_id: job.id,
        p_entry: stageLogEntry,
        p_tokens_in: result.metrics.tokensInput,
        p_tokens_out: result.metrics.tokensOutput,
        p_cost: result.metrics.costUsd,
      });

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

      // Rate limit da API não é falha do job: volta pra fila daqui a 2 min sem
      // queimar tentativa (o claim já incrementou attempts — desfaz).
      if (isLlmRateLimitError(e)) {
        await db
          .from("jobs")
          .update({
            status: "queued",
            error: message,
            attempts: Math.max(0, job.attempts - 1),
            locked_at: null,
            locked_by: null,
            run_at: new Date(Date.now() + 2 * 60_000).toISOString(),
          })
          .eq("id", job.id);
        return "requeued";
      }

      const exhausted = job.attempts >= (job.max_attempts ?? 3);
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

/**
 * Aviso de atraso ao usuário (regra: atraso só existe DEPOIS do delivery_time).
 * Job do dia ainda não concluído após o horário de entrega → 1 mensagem por
 * job/dia (dedupe em jobs.late_notified_at) para cada destino verificado.
 */
async function notifyLateJobs(db: SupabaseClient): Promise<number> {
  if (!process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN) return 0;

  const { data: jobs, error } = await db
    .from("jobs")
    .select("id, profile_id, run_date, status, briefing_profiles(delivery_time, timezone)")
    .in("status", ["queued", "running", "failed"])
    .is("late_notified_at", null);
  if (error || !jobs?.length) return 0;

  const zapi = new ZapiClient();
  let notified = 0;

  for (const job of jobs) {
    const profile = job.briefing_profiles as unknown as {
      delivery_time: string | null;
      timezone: string | null;
    } | null;
    if (!profile) continue;

    const { date, minutes } = localClock(profile.timezone ?? "America/Sao_Paulo");
    if (job.run_date !== date) continue; // só o job de hoje conta como "atrasado"
    if (minutes <= deliveryMinutesOf(profile.delivery_time)) continue; // ainda no prazo

    const { data: destinations } = await db
      .from("whatsapp_destinations")
      .select("phone")
      .eq("profile_id", job.profile_id)
      .eq("verified", true)
      .eq("active", true);

    for (const dest of destinations ?? []) {
      try {
        await zapi.sendText(
          dest.phone,
          "Bom dia! Seu briefing de hoje está levando alguns minutos a mais que o normal. Já chega! 🕖",
        );
      } catch (e) {
        console.error(`late notice ${job.id} → ${dest.phone}: ${e}`);
      }
    }

    await db
      .from("jobs")
      .update({ late_notified_at: new Date().toISOString() })
      .eq("id", job.id);
    notified++;
  }

  return notified;
}

// Alerta operacional (WhatsApp do operador): fila represada ou jobs falhando.
const OPS_ALERT_COOLDOWN_MS = 60 * 60_000;
const OPS_QUEUE_LAG_ALERT_MS = 30 * 60_000;

async function sendOpsAlert(db: SupabaseClient): Promise<boolean> {
  const phone = process.env.OPS_ALERT_PHONE;
  if (!phone || !process.env.ZAPI_INSTANCE_ID || !process.env.ZAPI_TOKEN) return false;

  // cooldown de 1h via app_config (server-only)
  const { data: cfg } = await db
    .from("app_config")
    .select("value")
    .eq("key", "ops_alert_last_at")
    .maybeSingle();
  const lastAt = typeof cfg?.value === "string" ? Date.parse(cfg.value) : 0;
  if (Number.isFinite(lastAt) && Date.now() - lastAt < OPS_ALERT_COOLDOWN_MS) return false;

  const problems: string[] = [];

  const { data: oldest } = await db
    .from("jobs")
    .select("run_at")
    .eq("status", "queued")
    .lte("run_at", new Date().toISOString())
    .order("run_at")
    .limit(1);
  const oldestRunAt = oldest?.[0]?.run_at ? Date.parse(oldest[0].run_at) : null;
  if (oldestRunAt && Date.now() - oldestRunAt > OPS_QUEUE_LAG_ALERT_MS) {
    problems.push(`fila represada há ${Math.round((Date.now() - oldestRunAt) / 60_000)} min`);
  }

  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: failures } = await db
    .from("jobs")
    .select("id, error")
    .eq("status", "failed")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (failures?.length) {
    const lastError = String(failures[0]?.error ?? "sem detalhe").slice(0, 200);
    problems.push(`${failures.length} job(s) FAILED nas últimas 24h — último erro: ${lastError}`);
  }

  if (problems.length === 0) return false;

  try {
    await new ZapiClient().sendText(phone, `⚠️ Briefing ops:\n- ${problems.join("\n- ")}`);
    await db
      .from("app_config")
      .upsert({ key: "ops_alert_last_at", value: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error(`ops alert: ${e}`);
    return false;
  }
}

/** Tick completo: requeue de stale + dispatch + processamento + avisos. */
export async function tick(workerId: string) {
  const db = createAdminClient();
  const { data: requeued } = await db.rpc("requeue_stale_jobs");
  const enqueued = await dispatchDueJobs(db);
  const summary = await processQueue(db, workerId);

  // avisos nunca derrubam o tick
  let lateNotified = 0;
  let opsAlerted = false;
  try {
    lateNotified = await notifyLateJobs(db);
  } catch (e) {
    console.error(`notifyLateJobs: ${e}`);
  }
  try {
    opsAlerted = await sendOpsAlert(db);
  } catch (e) {
    console.error(`sendOpsAlert: ${e}`);
  }

  return { requeued: requeued ?? 0, enqueued, lateNotified, opsAlerted, ...summary };
}
