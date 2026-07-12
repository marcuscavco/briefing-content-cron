/**
 * Gera os relatórios do experimento de modelos (Fase B) a partir de
 * bench/results/*.json:
 *  - docs/experimento-modelos.md — técnico, com nomes de modelo e custos
 *  - docs/experimento-cego.md   — julgamento editorial cego (Modelo 1/2/3)
 *  - bench/results/gabarito.json — mapeamento cego (gitignored, NÃO abrir
 *    antes de julgar)
 *
 * Uso: pnpm tsx scripts/bench-report.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RESULTS_DIR = join(__dirname, "..", "bench", "results");
const DOCS_DIR = join(__dirname, "..", "docs");
const BRL_PER_USD = 5.5;

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

const MODEL_LABEL: Record<string, string> = {
  "anthropic:claude-sonnet-5": "Claude Sonnet 5 (baseline/produção)",
  "anthropic:claude-haiku-4-5": "Claude Haiku 4.5",
  "google:gemini-3-flash-preview": "Gemini 3 Flash",
};

const DIGEST = new Set(["must_read", "relevante", "no_radar", "sinal_sem_fonte"]);

function coverage(baseline: RunResult, candidate: RunResult): number | null {
  if (!baseline.ok || !candidate.ok) return null;
  const base = new Set(
    baseline.clusters.filter((c) => DIGEST.has(c.categoria)).flatMap((c) => c.itemIndices),
  );
  if (base.size === 0) return null;
  const cand = new Set(
    candidate.clusters.filter((c) => DIGEST.has(c.categoria)).flatMap((c) => c.itemIndices),
  );
  let hit = 0;
  for (const i of base) if (cand.has(i)) hit++;
  return hit / base.size;
}

// permutação determinística por fixture (sem Math.random: reproduzível)
function permFor(name: string, n: number): number[] {
  const seed = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1, s = seed; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx;
}

function catCounts(r: RunResult): string {
  const c = r.clusters.reduce<Record<string, number>>((acc, cl) => {
    acc[cl.categoria] = (acc[cl.categoria] ?? 0) + 1;
    return acc;
  }, {});
  return ["must_read", "relevante", "no_radar", "sinal_sem_fonte", "descartado"]
    .filter((k) => c[k])
    .map((k) => `${k}: ${c[k]}`)
    .join(" · ");
}

function main() {
  const runs: RunResult[] = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json") && f.includes("__"))
    .map((f) => JSON.parse(readFileSync(join(RESULTS_DIR, f), "utf8")));
  const fixtures = [...new Set(runs.map((r) => r.fixture))].sort();
  const models = [...new Set(runs.map((r) => r.model))];
  const baselineModel = "anthropic:claude-sonnet-5";

  const grounding = (() => {
    try {
      return JSON.parse(readFileSync(join(RESULTS_DIR, "grounding-probe.json"), "utf8"));
    } catch {
      return null;
    }
  })();

  // ── relatório técnico ──────────────────────────────────────────────────────
  const tech: string[] = [
    "# Experimento de modelos — clusterização (Fase B)",
    "",
    `> Gerado em 2026-07-12 a partir de ${fixtures.length} dias reais de coleta (bench/fixtures, extraídos de jobs.checkpoint de produção), mesmo prompt/schema de produção (CLUSTER_SYSTEM/CLUSTER_SCHEMA). Câmbio usado: R$ ${BRL_PER_USD.toFixed(2)}/US$.`,
    "",
    "## Medições por dia × modelo",
    "",
    "| Fixture | Modelo | Custo (US$) | Latência | Tokens in/out | Clusters | Categorias | Cobertura vs baseline |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const fx of fixtures) {
    const baseline = runs.find((r) => r.fixture === fx && r.model === baselineModel)!;
    for (const m of models) {
      const r = runs.find((x) => x.fixture === fx && x.model === m);
      if (!r) continue;
      if (!r.ok) {
        tech.push(`| ${fx} | ${MODEL_LABEL[m] ?? m} | — | — | — | FALHOU | ${r.error?.slice(0, 60)} | — |`);
        continue;
      }
      const cov = coverage(baseline, r);
      tech.push(
        `| ${fx} | ${MODEL_LABEL[m] ?? m} | ${r.costUsd.toFixed(4)} | ${(r.latencyMs / 1000).toFixed(0)}s | ${r.tokensIn}/${r.tokensOut} | ${r.clusters.length} | ${catCounts(r)} | ${cov === null ? "—" : `${(cov * 100).toFixed(0)}%`} |`,
      );
    }
  }

  // médias por modelo
  tech.push("", "## Médias por modelo (clusterização)", "");
  tech.push("| Modelo | Custo médio/briefing (US$) | Latência média | Cobertura média vs baseline |");
  tech.push("|---|---|---|---|");
  const avgClusterCost: Record<string, number> = {};
  for (const m of models) {
    const ok = runs.filter((r) => r.model === m && r.ok);
    if (ok.length === 0) continue;
    const cost = ok.reduce((a, r) => a + r.costUsd, 0) / ok.length;
    avgClusterCost[m] = cost;
    const lat = ok.reduce((a, r) => a + r.latencyMs, 0) / ok.length / 1000;
    const covs = ok
      .map((r) => coverage(runs.find((b) => b.fixture === r.fixture && b.model === baselineModel)!, r))
      .filter((c): c is number => c !== null);
    const cov = covs.length ? covs.reduce((a, c) => a + c, 0) / covs.length : null;
    tech.push(
      `| ${MODEL_LABEL[m] ?? m} | ${cost.toFixed(4)} | ${lat.toFixed(0)}s | ${cov === null ? "—" : `${(cov * 100).toFixed(0)}%`} |`,
    );
  }

  // projeção mensal (cluster medido + demais estágios medidos em produção)
  const POSTS_SONNET = 0.0275; // 961 in / 1.636 out no Sonnet (stage_log)
  const POSTS_HAIKU = 0.0091;
  const MEMORY_CHEAP = 0.0012;
  tech.push(
    "",
    "## Projeção de COGS por usuário (briefing diário)",
    "",
    "Custo do cluster = medido neste experimento; posts/memória = medições de produção (stage_log).",
    "",
    "| Cenário | US$/dia | R$/mês | Meta ≤ R$ 12 |",
    "|---|---|---|---|",
  );
  const scenario = (label: string, cluster: number, posts: number) => {
    const day = cluster + posts + MEMORY_CHEAP;
    const month = day * 30 * BRL_PER_USD;
    tech.push(
      `| ${label} | ${day.toFixed(3)} | ${month.toFixed(2)} | ${month <= 12 ? "✅" : "❌"} |`,
    );
  };
  const sonnetC = avgClusterCost[baselineModel] ?? 0.16;
  const haikuC = avgClusterCost["anthropic:claude-haiku-4-5"];
  const flashC = avgClusterCost["google:gemini-3-flash-preview"];
  scenario("Sonnet cluster + Sonnet posts (atual)", sonnetC, POSTS_SONNET);
  if (haikuC !== undefined) scenario("Haiku cluster + Sonnet posts", haikuC, POSTS_SONNET);
  if (flashC !== undefined) scenario("Gemini Flash cluster + Sonnet posts", flashC, POSTS_SONNET);
  if (haikuC !== undefined) scenario("Haiku cluster + Haiku posts", haikuC, POSTS_HAIKU);
  if (flashC !== undefined) scenario("Gemini Flash cluster + Haiku posts", flashC, POSTS_HAIKU);

  if (grounding) {
    tech.push(
      "",
      '## Protótipo "Radar aberto" — grounding no Google Search (Gemini)',
      "",
      `Probe com os temas reais do perfil tech (${grounding.model}):`,
      "",
      `- Latência: ${grounding.latencyS}s · custo de tokens: US$ ${grounding.tokenCostUsd} por chamada (grounding tem cobrança adicional por request — confirmar tabela vigente)`,
      `- Fontes citadas: ${grounding.nSources} · **confiáveis (allowlist): ${grounding.nTrusted} (${grounding.pctTrusted}%)**`,
      `- Domínios retornados: ${[...new Set((grounding.sources as { domain: string }[]).map((s) => s.domain))].join(", ")}`,
      "",
      "Aprendizados do probe:",
      "",
      "1. **O conteúdo veio atual e real** (as manchetes batem com o que o universo fechado coletou no mesmo dia) — mas só depois de ancorar a data de hoje no prompt; sem isso o modelo buscou notícias da época do treino.",
      "2. **Sem gate de grounding, o modelo às vezes responde de memória** (0 buscas) com notícias plausíveis porém não verificáveis — em produção isso seria notícia inventada. O gate `groundingMetadata presente, senão retry` é obrigatório.",
      "3. **A maioria das fontes retornadas é de portais pequenos/duvidosos** (a dor relatada) — o filtro por allowlist derruba a maior parte das citações. Estratégia recomendada: usar o grounding apenas para **descobrir assuntos** (sinais), e confirmar/citar somente via fontes do universo confiável; nunca linkar domínio fora da allowlist.",
      "",
      "Grok Live Search (xAI): não testado na prática — a conta ainda não tem créditos (console.x.ai). Custo de tabela: US$ 25/1.000 fontes retornadas + tokens (grok-4.1-fast US$ 0,20/0,50 por 1M). O script `probe-grounded-search.ts` está pronto para ganhar um `--provider grok` se os créditos forem adicionados.",
    );
  }

  tech.push(
    "",
    "## Como decidir",
    "",
    "A decisão de qualidade é editorial e está em `docs/experimento-cego.md` (modelos anonimizados e embaralhados por dia). Critério combinado: se um modelo barato mantiver ≥90% da qualidade percebida vs o baseline, a clusterização migra (`LLM_CLUSTER` na Vercel — sem deploy). Posts permanecem no Sonnet 5 até um experimento próprio.",
    "",
    "O gabarito está em `bench/results/gabarito.json` (fora do repo). Não abra antes de julgar.",
    "",
  );
  writeFileSync(join(DOCS_DIR, "experimento-modelos.md"), tech.join("\n"));

  // ── relatório cego ─────────────────────────────────────────────────────────
  const blind: string[] = [
    "# Julgamento cego — clusterização (Fase B)",
    "",
    "> Para cada dia abaixo, três modelos clusterizaram **exatamente os mesmos itens coletados** com o mesmo prompt de produção. A ordem foi embaralhada por dia e os nomes ocultados. Avalie como editor: qual seleção você gostaria de receber no seu briefing?",
    "",
    "**Como julgar cada dia:** (a) os must-reads escolhidos são os certos? (b) os títulos/resumos estão bons? (c) as notas 💻/💼 fazem sentido? (d) algo importante ficou de fora ou algo irrelevante entrou?",
    "",
    "Responda por dia: `melhor: Modelo X · aceitável: [...] · inaceitável: [...]` — e ao final, um veredito geral.",
    "",
    "---",
    "",
  ];
  const gabarito: Record<string, Record<string, string>> = {};
  for (const fx of fixtures) {
    const fxRuns = models
      .map((m) => runs.find((r) => r.fixture === fx && r.model === m))
      .filter((r): r is RunResult => !!r && r.ok);
    const perm = permFor(fx, fxRuns.length);
    blind.push(`## Dia: ${fx}`, "");
    gabarito[fx] = {};
    perm.forEach((origIdx, pos) => {
      const r = fxRuns[origIdx]!;
      gabarito[fx][`Modelo ${pos + 1}`] = r.model;
      const digest = r.clusters
        .filter((c) => DIGEST.has(c.categoria))
        .sort((a, b) => b.heat - a.heat);
      blind.push(`### Modelo ${pos + 1}`, "");
      blind.push(`_${r.clusters.length} clusters no total · ${catCounts(r)}_`, "");
      for (const c of digest.slice(0, 8)) {
        blind.push(
          `- **[${c.categoria}]** ${c.titulo} — 🎯${c.tema} ⚡${c.impacto} · heat ${c.heat} · ${c.portais.slice(0, 4).join(", ")}`,
        );
        blind.push(`  ${c.resumo}`);
      }
      if (digest.length > 8) blind.push(`- _(+${digest.length - 8} itens no digest)_`);
      blind.push("");
    });
    blind.push("---", "");
  }
  writeFileSync(join(DOCS_DIR, "experimento-cego.md"), blind.join("\n"));
  writeFileSync(join(RESULTS_DIR, "gabarito.json"), JSON.stringify(gabarito, null, 2));

  console.log("gerados: docs/experimento-modelos.md, docs/experimento-cego.md, bench/results/gabarito.json");
}

main();
