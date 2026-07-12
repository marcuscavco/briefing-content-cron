/**
 * Benchmark de clusterização (Fase B): roda o MESMO prompt de produção
 * (CLUSTER_SYSTEM/CLUSTER_SCHEMA) sobre dias reais de coleta (bench/fixtures/*.json,
 * extraídos de jobs.checkpoint) em vários provider:modelo e mede custo, latência
 * e alinhamento com o baseline (Sonnet 5).
 *
 * Uso: pnpm tsx scripts/bench-cluster.ts [--models anthropic:claude-sonnet-5,google:...]
 * Requer: ANTHROPIC_API_KEY, GEMINI_API_KEY (e XAI_API_KEY se testar Grok).
 * Saída: bench/results/<fixture>__<modelo>.json + bench/results/summary.json
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildProvider } from "../packages/curation/src/providers/router";
import { CLUSTER_SCHEMA, CLUSTER_SYSTEM } from "../packages/curation/src/prompts";
import { parseJson } from "../packages/curation/src/providers/llm";
import { categorize, computeHeat, DEFAULT_WEIGHTS } from "../packages/curation/src/heat";
import type { CollectedItem, RawCluster } from "../packages/curation/src/types";

const FIXTURES_DIR = join(__dirname, "..", "bench", "fixtures");
const RESULTS_DIR = join(__dirname, "..", "bench", "results");

const DEFAULT_MODELS = [
  "anthropic:claude-sonnet-5", // baseline (produção hoje)
  "anthropic:claude-haiku-4-5",
  "google:gemini-3-flash-preview",
];

interface FixtureItem { t: string; p: string; tr: 1 | 2 | 3; d: string; s: string }
interface Fixture { name: string; themes: string[]; items: FixtureItem[] }

interface ParsedCluster {
  titulo: string;
  resumo: string;
  entidades: string[];
  item_indices: number[];
  relevancia_tema: 0 | 1 | 2 | 3;
  impacto_geral: 0 | 1 | 2 | 3;
  angulo_pratico_claro: boolean;
  data_evento: string | null;
}

interface RunResult {
  fixture: string;
  model: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  clusters: {
    titulo: string;
    resumo: string;
    categoria: string;
    heat: number;
    tema: number;
    impacto: number;
    itemIndices: number[];
    portais: string[];
  }[];
}

function toCollectedItems(fx: Fixture): CollectedItem[] {
  return fx.items.map((i) => ({
    title: i.t,
    url: "",
    publishedAt: i.d || null,
    summary: i.s,
    sourceId: "",
    portal: i.p,
    tier: i.tr,
  }));
}

// idêntico ao pipeline.cluster(): numeração, portal, tier, data e resumo 280
function buildUserMessage(fx: Fixture): string {
  const itemList = fx.items
    .map(
      (item, i) =>
        `${i}. [${item.p} T${item.tr}] ${item.t}${item.d ? ` (${item.d})` : ""}\n   ${item.s.slice(0, 280)}`,
    )
    .join("\n");
  return `TEMAS DE INTERESSE: ${fx.themes.join(", ")}\nTEMAS EXCLUÍDOS: (nenhum)\n\nITENS (${fx.items.length}):\n${itemList}`;
}

async function runOne(fx: Fixture, modelSpec: string): Promise<RunResult> {
  const provider = buildProvider(modelSpec);
  const items = toCollectedItems(fx);
  const started = Date.now();
  try {
    const result = await provider.complete({
      task: "cluster",
      system: CLUSTER_SYSTEM,
      user: buildUserMessage(fx),
      maxTokens: 40_000,
      jsonSchema: CLUSTER_SCHEMA as unknown as Record<string, unknown>,
    });
    const parsed = parseJson<{ clusters: ParsedCluster[] }>(result.text);
    const clusters = parsed.clusters
      .filter((c) => Array.isArray(c.item_indices) && c.item_indices.length > 0)
      .map((c) => {
        const raw: RawCluster = {
          titulo: c.titulo,
          resumo: c.resumo,
          entidades: c.entidades ?? [],
          itemIndices: c.item_indices.filter((i) => i >= 0 && i < items.length),
          relevanciaTema: c.relevancia_tema,
          impactoGeral: c.impacto_geral,
          anguloPraticoClaro: c.angulo_pratico_claro,
          dataEvento: c.data_evento,
        };
        const { heat, portais } = computeHeat(raw, items, DEFAULT_WEIGHTS);
        return {
          titulo: c.titulo,
          resumo: c.resumo,
          categoria: categorize(heat),
          heat,
          tema: c.relevancia_tema,
          impacto: c.impacto_geral,
          itemIndices: raw.itemIndices,
          portais,
        };
      });
    return {
      fixture: fx.name,
      model: modelSpec,
      ok: true,
      latencyMs: Date.now() - started,
      tokensIn: result.usage.inputTokens,
      tokensOut: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
      clusters,
    };
  } catch (e) {
    return {
      fixture: fx.name,
      model: modelSpec,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      latencyMs: Date.now() - started,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      clusters: [],
    };
  }
}

const DIGEST = new Set(["must_read", "relevante", "no_radar", "sinal_sem_fonte"]);

/** % dos itens do digest do baseline que o candidato também colocou em digest. */
function coverageVsBaseline(baseline: RunResult, candidate: RunResult): number | null {
  if (!baseline.ok || !candidate.ok) return null;
  const baseItems = new Set(
    baseline.clusters.filter((c) => DIGEST.has(c.categoria)).flatMap((c) => c.itemIndices),
  );
  if (baseItems.size === 0) return null;
  const candItems = new Set(
    candidate.clusters.filter((c) => DIGEST.has(c.categoria)).flatMap((c) => c.itemIndices),
  );
  let hit = 0;
  for (const i of baseItems) if (candItems.has(i)) hit++;
  return hit / baseItems.size;
}

async function main() {
  const modelsArg = process.argv.find((a) => a.startsWith("--models="));
  const models = modelsArg ? modelsArg.slice(9).split(",") : DEFAULT_MODELS;
  mkdirSync(RESULTS_DIR, { recursive: true });

  const fixtures = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), "utf8")) as Fixture);

  const all: RunResult[] = [];
  for (const fx of fixtures) {
    for (const model of models) {
      process.stdout.write(`▶ ${fx.name} × ${model} ... `);
      const r = await runOne(fx, model);
      all.push(r);
      const file = join(RESULTS_DIR, `${fx.name}__${model.replace(/[:/]/g, "_")}.json`);
      writeFileSync(file, JSON.stringify(r, null, 2));
      console.log(
        r.ok
          ? `ok ${r.clusters.length} clusters · $${r.costUsd.toFixed(4)} · ${(r.latencyMs / 1000).toFixed(1)}s`
          : `FALHOU: ${r.error?.slice(0, 120)}`,
      );
    }
  }

  // resumo com cobertura vs baseline (primeiro modelo da lista)
  const summary = fixtures.map((fx) => {
    const runs = all.filter((r) => r.fixture === fx.name);
    const baseline = runs.find((r) => r.model === models[0])!;
    return {
      fixture: fx.name,
      nItems: fx.items.length,
      runs: runs.map((r) => ({
        model: r.model,
        ok: r.ok,
        error: r.error,
        costUsd: Number(r.costUsd.toFixed(5)),
        latencyS: Number((r.latencyMs / 1000).toFixed(1)),
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        nClusters: r.clusters.length,
        porCategoria: r.clusters.reduce<Record<string, number>>((acc, c) => {
          acc[c.categoria] = (acc[c.categoria] ?? 0) + 1;
          return acc;
        }, {}),
        coberturaVsBaseline: coverageVsBaseline(baseline, r),
      })),
    };
  });
  writeFileSync(join(RESULTS_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("\nResumo salvo em bench/results/summary.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
