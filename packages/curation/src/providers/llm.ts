import Anthropic from "@anthropic-ai/sdk";

/**
 * Camada de LLM da plataforma, multi-provider (Fase B).
 * Tarefas por estágio do pipeline:
 *   cluster = clusterização + notas dimensionais (~76% do custo — alvo de otimização)
 *   posts   = sugestões de post (voz do produto — qualidade > custo)
 *   cheap   = judges baratos (novidade da memória, relevância de preview)
 * O mapeamento task → provider:modelo vive no RoutedLlmProvider (router.ts),
 * configurável por env (LLM_CLUSTER/LLM_POSTS/LLM_CHEAP) sem deploy.
 */

export type LlmTask = "cluster" | "posts" | "cheap";

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LlmResult {
  text: string;
  usage: LlmUsage;
}

export interface LlmRequest {
  task: LlmTask;
  system: string; // instruções fixas — cacheadas quando o provider suporta
  user: string; // conteúdo variável do dia
  maxTokens?: number;
  /** JSON Schema — quando presente, força saída estruturada validada pela API. */
  jsonSchema?: Record<string, unknown>;
}

export interface LlmProvider {
  complete(req: LlmRequest): Promise<LlmResult>;
}

/**
 * Rate limit persistente do provedor. O worker trata devolvendo o job à fila
 * (run_at adiado, checkpoint preservado) em vez de dormir dentro do orçamento
 * do tick — com workers concorrentes, dormir 65s aqui estrangulava a fila.
 */
export class LlmRateLimitError extends Error {
  readonly isLlmRateLimit = true;
  constructor(message = "rate limit do provedor LLM") {
    super(message);
    this.name = "LlmRateLimitError";
  }
}

export function isLlmRateLimitError(e: unknown): e is LlmRateLimitError {
  return typeof e === "object" && e !== null && (e as LlmRateLimitError).isLlmRateLimit === true;
}

/**
 * USD por 1M tokens, por modelo. cacheRead/cacheWrite só se aplicam a providers
 * com prompt caching (Anthropic). Modelo fora da tabela → custo 0 + warning
 * (não derruba o pipeline; corrigir a tabela).
 */
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; cacheRead?: number }
> = {
  "claude-sonnet-5": { input: 3, output: 15, cacheRead: 0.3 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1 },
  "gemini-3-flash-preview": { input: 0.5, output: 3 },
  "gemini-3.5-flash": { input: 1.5, output: 9 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
  "grok-4.1-fast": { input: 0.2, output: 0.5 },
  "grok-4.1-fast-non-reasoning": { input: 0.2, output: 0.5 },
};

export function priceOf(model: string): { input: number; output: number; cacheRead: number } {
  const p = MODEL_PRICING[model];
  if (!p) {
    console.warn(`MODEL_PRICING sem entrada para "${model}" — custo será reportado como 0`);
    return { input: 0, output: 0, cacheRead: 0 };
  }
  return { input: p.input, output: p.output, cacheRead: p.cacheRead ?? p.input * 0.1 };
}

function computeAnthropicCost(
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  },
): number {
  const p = priceOf(model);
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  return (
    (usage.input_tokens * p.input +
      cacheWrite * p.input * 1.25 +
      cacheRead * p.cacheRead +
      usage.output_tokens * p.output) /
    1_000_000
  );
}

export class ClaudeLlmProvider implements LlmProvider {
  private client: Anthropic;

  constructor(
    private readonly model: string,
    apiKey = process.env.ANTHROPIC_API_KEY,
  ) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    // 429: uma retentativa curta cobre blips; se persistir, lança erro tipado
    // para o worker requeuar o job (não dormir a janela inteira do minuto aqui).
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.completeOnce(req);
      } catch (e) {
        const isRateLimit = e instanceof Anthropic.RateLimitError;
        if (!isRateLimit) throw e;
        if (attempt >= 2) throw new LlmRateLimitError(e.message);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }

  private async completeOnce(req: LlmRequest): Promise<LlmResult> {
    // Streaming sempre: com adaptive thinking o max_tokens cobre pensamento +
    // saída, então tetos altos são normais — e streaming evita timeout HTTP.
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: req.maxTokens ?? 8192,
      system: [
        {
          type: "text",
          text: req.system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: req.user }],
      ...(req.jsonSchema
        ? {
            output_config: {
              format: {
                type: "json_schema" as const,
                schema: req.jsonSchema,
              },
            },
          }
        : {}),
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      throw new Error("LLM recusou a requisição (stop_reason=refusal)");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("LLM estourou max_tokens — saída truncada");
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      usage: {
        inputTokens:
          response.usage.input_tokens +
          (response.usage.cache_read_input_tokens ?? 0) +
          (response.usage.cache_creation_input_tokens ?? 0),
        outputTokens: response.usage.output_tokens,
        costUsd: computeAnthropicCost(this.model, response.usage),
      },
    };
  }
}

/** Fake determinístico para testes: responde com o handler registrado por marcador. */
export class FakeLlmProvider implements LlmProvider {
  constructor(
    private readonly handler: (req: LlmRequest) => string | Promise<string>,
  ) {}

  async complete(req: LlmRequest): Promise<LlmResult> {
    const text = await this.handler(req);
    return {
      text,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    };
  }
}

export function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}
