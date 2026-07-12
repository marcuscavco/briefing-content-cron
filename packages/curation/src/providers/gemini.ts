import {
  LlmRateLimitError,
  priceOf,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
} from "./llm";

/**
 * Provider Gemini (Google AI / Generative Language API) via REST puro — sem
 * dependência nova. Structured output: tenta `responseJsonSchema` (JSON Schema
 * padrão, Gemini 2.5+); se a API rejeitar, cai para `responseSchema` (subset
 * OpenAPI) convertido por toGeminiSchema().
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 240_000;

/**
 * JSON Schema (draft) → subset OpenAPI do responseSchema Gemini:
 * - remove `additionalProperties` (não suportado)
 * - `type: ["string","null"]` → `{ type: "string", nullable: true }`
 * - `enum` só sobrevive em strings (enums numéricos são rejeitados; a
 *   validação de faixa fica com o prompt/código)
 */
export function toGeminiSchema(node: unknown): Record<string, unknown> {
  if (typeof node !== "object" || node === null) return {};
  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  let type = src.type;
  if (Array.isArray(type)) {
    const nonNull = type.filter((t) => t !== "null");
    if (nonNull.length !== type.length) out.nullable = true;
    type = nonNull[0] ?? "string";
  }
  if (typeof type === "string") out.type = type;

  if (Array.isArray(src.enum) && out.type === "string") out.enum = src.enum;
  if (typeof src.description === "string") out.description = src.description;
  if (Array.isArray(src.required)) out.required = src.required;

  if (typeof src.properties === "object" && src.properties !== null) {
    out.properties = Object.fromEntries(
      Object.entries(src.properties as Record<string, unknown>).map(([k, v]) => [
        k,
        toGeminiSchema(v),
      ]),
    );
  }
  if (typeof src.items === "object" && src.items !== null) {
    out.items = toGeminiSchema(src.items);
  }

  return out;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  error?: { code?: number; message?: string; status?: string };
}

export class GeminiLlmProvider implements LlmProvider {
  // memoriza se a API aceitou responseJsonSchema para não pagar o 400 sempre
  private jsonSchemaSupported: boolean | null = null;

  constructor(
    private readonly model: string,
    private readonly apiKey = process.env.GEMINI_API_KEY,
  ) {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY não configurada");
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    if (req.jsonSchema && this.jsonSchemaSupported !== false) {
      try {
        const result = await this.completeOnce(req, "responseJsonSchema");
        this.jsonSchemaSupported = true;
        return result;
      } catch (e) {
        // 400 mencionando o campo → API/modelo sem suporte; usa o conversor
        if (e instanceof GeminiBadRequestError && /json_?schema/i.test(e.message)) {
          this.jsonSchemaSupported = false;
        } else {
          throw e;
        }
      }
    }
    return this.completeOnce(req, "responseSchema");
  }

  private async completeOnce(
    req: LlmRequest,
    schemaField: "responseJsonSchema" | "responseSchema",
  ): Promise<LlmResult> {
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: req.maxTokens ?? 8192,
    };
    if (req.jsonSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig[schemaField] =
        schemaField === "responseJsonSchema" ? req.jsonSchema : toGeminiSchema(req.jsonSchema);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${GEMINI_BASE}/${this.model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey!,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.user }] }],
          generationConfig,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const data = (await res.json()) as GeminiResponse;
    if (res.status === 429) throw new LlmRateLimitError(data.error?.message);
    if (res.status === 400) throw new GeminiBadRequestError(data.error?.message ?? "bad request");
    if (!res.ok || data.error) {
      throw new Error(`Gemini ${res.status}: ${data.error?.message ?? "erro desconhecido"}`);
    }

    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error("Gemini não retornou candidato (possível bloqueio de safety)");
    if (candidate.finishReason === "MAX_TOKENS") {
      throw new Error("LLM estourou max_tokens — saída truncada");
    }

    const text = (candidate.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("");

    const usage = data.usageMetadata ?? {};
    const inputTokens = usage.promptTokenCount ?? 0;
    // thinking conta como output para efeito de custo (mesmo critério da Anthropic)
    const outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
    const p = priceOf(this.model);

    return {
      text,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: (inputTokens * p.input + outputTokens * p.output) / 1_000_000,
      },
    };
  }
}

class GeminiBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiBadRequestError";
  }
}
