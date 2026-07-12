import {
  LlmRateLimitError,
  priceOf,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
} from "./llm";

/**
 * Provider Grok (xAI) via API OpenAI-compatível (chat/completions), REST puro.
 * Structured output via response_format json_schema (strict). Inativo por
 * padrão — só entra em uso se LLM_* apontar para `xai:<modelo>` (a conta
 * precisa de créditos em console.x.ai).
 */

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 240_000;

interface GrokResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: string | { message?: string };
}

export class GrokLlmProvider implements LlmProvider {
  constructor(
    private readonly model: string,
    private readonly apiKey = process.env.XAI_API_KEY,
  ) {
    if (!this.apiKey) throw new Error("XAI_API_KEY não configurada");
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(XAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: req.maxTokens ?? 8192,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          ...(req.jsonSchema
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: { name: "output", schema: req.jsonSchema, strict: true },
                },
              }
            : {}),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const data = (await res.json()) as GrokResponse;
    if (res.status === 429) throw new LlmRateLimitError(JSON.stringify(data).slice(0, 200));
    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error : data.error?.message;
      throw new Error(`Grok ${res.status}: ${msg ?? JSON.stringify(data).slice(0, 200)}`);
    }

    const choice = data.choices?.[0];
    if (!choice?.message?.content) throw new Error("Grok não retornou conteúdo");
    if (choice.finish_reason === "length") {
      throw new Error("LLM estourou max_tokens — saída truncada");
    }

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const p = priceOf(this.model);

    return {
      text: choice.message.content,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: (inputTokens * p.input + outputTokens * p.output) / 1_000_000,
      },
    };
  }
}
