/**
 * Protótipo "Radar aberto" (Fase B): busca de notícias FORA do universo fechado
 * de fontes, com segurança de origem. Usa o grounding do Gemini no Google Search
 * e classifica cada citação retornada contra a allowlist de domínios confiáveis
 * (derivada do catálogo suggested_sources + agências/veículos de referência).
 *
 * Uso: pnpm tsx scripts/probe-grounded-search.ts [--themes "IA, chips"]
 * Requer: GEMINI_API_KEY. Saída: bench/results/grounding-probe.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { priceOf } from "../packages/curation/src/providers/llm";

const MODEL = "gemini-3-flash-preview";
const RESULTS_DIR = join(__dirname, "..", "bench", "results");

// Catálogo suggested_sources (ativo) + agências/veículos canônicos extras.
const TRUSTED_DOMAINS = new Set([
  // catálogo da plataforma
  "404media.co", "agenciabrasil.ebc.com.br", "arstechnica.com", "bloomberg.com",
  "braziljournal.com", "canaltech.com.br", "cnet.com", "convergenciadigital.com.br",
  "economist.com", "engadget.com", "estadao.com.br", "exame.com", "ft.com",
  "g1.globo.com", "infomoney.com.br", "mobiletime.com.br", "neofeed.com.br",
  "news.ycombinator.com", "nucleo.jor.br", "olhardigital.com.br", "platformer.news",
  "restofworld.org", "stratechery.com", "techcrunch.com", "technologyreview.com",
  "tecnoblog.net", "theinformation.com", "theshift.info", "theverge.com",
  "valor.globo.com", "wired.com", "folha.uol.com.br", "www1.folha.uol.com.br",
  // referência adicional (agências e veículos canônicos)
  "reuters.com", "apnews.com", "wsj.com", "nytimes.com", "cnbc.com", "axios.com",
  "theguardian.com", "bbc.com", "uol.com.br", "oglobo.globo.com",
]);

function domainOf(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

function isTrusted(domain: string): boolean {
  if (TRUSTED_DOMAINS.has(domain)) return true;
  // subdomínios de um domínio confiável contam (ex.: tech.reuters.com)
  for (const t of TRUSTED_DOMAINS) if (domain.endsWith(`.${t}`)) return true;
  return false;
}

interface GroundingChunk { web?: { uri?: string; title?: string; domain?: string } }

async function main() {
  // O modelo às vezes ignora a tool e responde de memória (= notícia inventada).
  // Aceita só execuções com grounding real; até 3 tentativas.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const done = await probeOnce(attempt);
    if (done) return;
    console.error(`tentativa ${attempt}: sem groundingMetadata (modelo respondeu de memória) — retry`);
  }
  throw new Error("3 tentativas sem grounding — modelo respondeu de memória em todas");
}

async function probeOnce(attempt: number): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const themesArg = process.argv.find((a) => a.startsWith("--themes="));
  const themes =
    themesArg?.slice(9) ??
    "Inteligência Artificial, SaaS & Cloud, Startups & Venture Capital, Big Techs, Cibersegurança, Hardware & Chips";

  const started = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "Você é o radar de notícias de um briefing executivo brasileiro de tecnologia e negócios. Você DEVE usar a ferramenta de busca do Google para TODAS as notícias — nunca responda de memória (memória = notícia inventada). Busque APENAS notícias publicadas nas últimas 48 horas; use o ano corrente nas queries. Prefira veículos de imprensa estabelecidos; ignore blogs desconhecidos, agregadores e conteúdo promocional. Responda em PT-BR.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                // data explícita: sem ela o modelo ancora "últimas 48h" na
                // época do treino e busca notícias velhas
                text: `HOJE é ${new Date().toISOString().slice(0, 10)}. Quais são as 8 notícias mais importantes publicadas nas últimas 48 horas (desde ${new Date(Date.now() - 48 * 3600_000).toISOString().slice(0, 10)}) sobre: ${themes}?\nPara cada uma: título, resumo de 1 frase e o veículo de origem.`,
              },
            ],
          },
        ],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    },
  );
  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      groundingMetadata?: {
        groundingChunks?: GroundingChunk[];
        webSearchQueries?: string[];
      };
    }[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
      toolUsePromptTokenCount?: number;
    };
    error?: { message?: string };
  };
  if (data.error) throw new Error(`Gemini: ${data.error.message}`);

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const queries = candidate?.groundingMetadata?.webSearchQueries ?? [];
  if (chunks.length === 0) return false; // sem busca real → retry no main()

  const sources = await Promise.all(
    chunks
      .filter((c) => c.web?.uri)
      .map(async (c) => {
        // o uri do grounding é um redirect (vertexaisearch.cloud.google.com);
        // resolve para a URL final — é ela que o filtro de allowlist valida
        let finalUrl = c.web!.uri!;
        try {
          const head = await fetch(finalUrl, { method: "GET", redirect: "manual" });
          const loc = head.headers.get("location");
          if (loc) finalUrl = loc;
        } catch {
          // mantém a URI original; classificada como não confiável
        }
        const rawDomain = c.web?.domain?.replace(/^www\./, "");
        const titleAsDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.web?.title ?? "")
          ? c.web!.title!.replace(/^www\./, "")
          : null;
        const resolved = domainOf(finalUrl);
        const domain = resolved.includes("vertexaisearch")
          ? (rawDomain ?? titleAsDomain ?? "desconhecido")
          : resolved;
        return { domain, title: c.web?.title ?? "", url: finalUrl, trusted: isTrusted(domain) };
      }),
  );
  const trusted = sources.filter((s) => s.trusted).length;

  const usage = data.usageMetadata ?? {};
  const tokensIn = (usage.promptTokenCount ?? 0) + (usage.toolUsePromptTokenCount ?? 0);
  const tokensOut = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  const p = priceOf(MODEL);
  const tokenCost = (tokensIn * p.input + tokensOut * p.output) / 1_000_000;

  const report = {
    model: MODEL,
    attempt,
    themes,
    latencyS: Number(((Date.now() - started) / 1000).toFixed(1)),
    webSearchQueries: queries,
    nSources: sources.length,
    nTrusted: trusted,
    pctTrusted: sources.length ? Number(((trusted / sources.length) * 100).toFixed(0)) : null,
    sources,
    tokens: { in: tokensIn, out: tokensOut },
    tokenCostUsd: Number(tokenCost.toFixed(5)),
    note: "custo de grounding por request é cobrado à parte do custo de tokens — confirmar tabela vigente em ai.google.dev/gemini-api/docs/pricing",
    answer: text,
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(join(RESULTS_DIR, "grounding-probe.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, answer: `${text.slice(0, 600)}…` }, null, 2));
  return true;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
