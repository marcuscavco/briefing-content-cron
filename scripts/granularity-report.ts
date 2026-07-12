/**
 * Relatório antes/depois da granularidade de cluster (Fase D).
 * ANTES  = prompt v1 (guarda-chuva) — bench/results/prompt-v1/
 * DEPOIS = prompt v2 (fato específico) — bench/results/
 * Saída: docs/experimento-granularidade.md (validação do Marcus antes do deploy)
 *
 * Uso: pnpm tsx scripts/granularity-report.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RESULTS = join(__dirname, "..", "bench", "results");
const OLD = join(RESULTS, "prompt-v1");
const DOCS = join(__dirname, "..", "docs");
const GEMINI = "google_gemini-3-flash-preview";
const SONNET = "anthropic_claude-sonnet-5";
const FIXTURES = [
  "marketing-2026-07-12",
  "negocios-2026-07-11",
  "tech-2026-07-10",
  "tech-2026-07-12",
];

interface Run {
  ok: boolean;
  costUsd: number;
  latencyMs: number;
  clusters: {
    titulo: string;
    categoria: string;
    heat: number;
    tema?: number;
    impacto?: number;
    itemIndices: number[];
  }[];
}

function load(dir: string, fx: string, model: string): Run | null {
  const p = join(dir, `${fx}__${model}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Run) : null;
}

const DIGEST = new Set(["must_read", "relevante", "no_radar", "sinal_sem_fonte"]);

function stats(r: Run) {
  const single = r.clusters.filter((c) => c.itemIndices.length === 1).length;
  const digest = r.clusters.filter((c) => DIGEST.has(c.categoria)).length;
  const avgItems =
    r.clusters.reduce((a, c) => a + c.itemIndices.length, 0) / Math.max(1, r.clusters.length);
  return { n: r.clusters.length, single, digest, avgItems };
}

function titleList(r: Run, max = 40): string[] {
  return [...r.clusters]
    .sort((a, b) => b.heat - a.heat)
    .slice(0, max)
    .map(
      (c) =>
        `- ${DIGEST.has(c.categoria) ? `**[${c.categoria}]**` : `_[${c.categoria}]_`} ${c.titulo} _(heat ${c.heat} · ${c.itemIndices.length} item${c.itemIndices.length > 1 ? "s" : ""})_`,
    );
}

function main() {
  const out: string[] = [
    "# Granularidade de cluster — antes/depois (Fase D)",
    "",
    "> **ANTES** = prompt v1 (\"um cluster = um assunto\" — instável: ora fatos, ora guarda-chuva como o do WhatsApp de 13/07).",
    "> **DEPOIS** = prompt v3 (\"um cluster = UMA HISTÓRIA: mesmo ator + mesmo fio narrativo; guarda-chuva multi-ator proibido\").",
    "> Mesmos 4 dias reais de coleta, mesmo modelo de produção (Gemini 3 Flash). Sonnet 5 incluído como referência de contagem.",
    "",
    "**Como validar:** os títulos do DEPOIS devem nomear fatos (\"Quem faz o quê\"); se algum título ainda parecer categoria/tema, reprove.",
    "",
    "---",
    "",
  ];

  const rows: string[] = [
    "| Dia | Gemini ANTES (clusters · digest · média itens) | Gemini DEPOIS | Sonnet DEPOIS (ref.) | Custo Gemini DEPOIS |",
    "|---|---|---|---|---|",
  ];

  for (const fx of FIXTURES) {
    const before = load(OLD, fx, GEMINI);
    const after = load(RESULTS, fx, GEMINI);
    const sonnet = load(RESULTS, fx, SONNET);
    if (!before || !after) continue;
    const b = stats(before);
    const a = stats(after);
    const s = sonnet ? stats(sonnet) : null;
    rows.push(
      `| ${fx} | ${b.n} · ${b.digest} · ${b.avgItems.toFixed(1)} | **${a.n} · ${a.digest} · ${a.avgItems.toFixed(1)}** | ${s ? `${s.n} · ${s.digest} · ${s.avgItems.toFixed(1)}` : "—"} | $${after.costUsd.toFixed(4)} · ${(after.latencyMs / 1000).toFixed(0)}s |`,
    );
  }
  out.push("## Resumo quantitativo", "", ...rows, "");
  out.push(
    "_Leitura esperada: DEPOIS com muito mais clusters (granularidade de fato), média de itens/cluster menor e digest honesto (só o que convergiu)._",
    "",
    "---",
    "",
  );

  for (const fx of FIXTURES) {
    const before = load(OLD, fx, GEMINI);
    const after = load(RESULTS, fx, GEMINI);
    if (!before || !after) continue;
    out.push(`## Dia: ${fx}`, "");
    out.push(`### ANTES (prompt v1) — ${before.clusters.length} clusters`, "");
    out.push(...titleList(before), "");
    out.push(`### DEPOIS (prompt v3) — ${after.clusters.length} clusters`, "");
    out.push(...titleList(after), "");
    out.push("---", "");
  }

  writeFileSync(join(DOCS, "experimento-granularidade.md"), out.join("\n"));
  console.log("gerado: docs/experimento-granularidade.md");
}

main();
