import Anthropic from "@anthropic-ai/sdk";

/**
 * Camada de LLM da plataforma. Roteamento por tarefa (decisão do brief §4):
 *   heavy = claude-sonnet-5 (clusterização/notas/posts)
 *   cheap = claude-haiku-4-5 (judge "há novidade material?")
 * Instruções fixas entram como bloco system com cache_control (prompt caching).
 */

export type LlmTask = "heavy" | "cheap";

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
  system: string; // instruções fixas — cacheadas
  user: string; // conteúdo variável do dia
  maxTokens?: number;
  /** JSON Schema — quando presente, força saída estruturada validada pela API. */
  jsonSchema?: Record<string, unknown>;
}

export interface LlmProvider {
  complete(req: LlmRequest): Promise<LlmResult>;
}

const MODELS: Record<LlmTask, string> = {
  heavy: "claude-sonnet-5",
  cheap: "claude-haiku-4-5",
};

// USD por 1M tokens (sonnet-5 preço cheio pós-introdutório; haiku 4.5)
const PRICING: Record<LlmTask, { input: number; output: number; cacheRead: number }> = {
  heavy: { input: 3, output: 15, cacheRead: 0.3 },
  cheap: { input: 1, output: 5, cacheRead: 0.1 },
};

function computeCost(
  task: LlmTask,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
): number {
  const p = PRICING[task];
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

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    const response = await this.client.messages.create({
      model: MODELS[req.task],
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
        costUsd: computeCost(req.task, response.usage),
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
