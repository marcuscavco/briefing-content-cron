import { GeminiLlmProvider } from "./gemini";
import { GrokLlmProvider } from "./grok";
import { ClaudeLlmProvider, type LlmProvider, type LlmRequest, type LlmResult, type LlmTask } from "./llm";

/**
 * Roteia cada task do pipeline para um provider:modelo configurado por env —
 * trocar de modelo é trocar env na Vercel, sem deploy. Defaults reproduzem o
 * comportamento pré-Fase B (Sonnet no cluster/posts, Haiku nos judges).
 *
 * Formato: `<vendor>:<modelo>` com vendor ∈ anthropic | google | xai.
 * Ex.: LLM_CLUSTER=google:gemini-3-flash-preview
 */

const TASK_ENV: Record<LlmTask, string> = {
  cluster: "LLM_CLUSTER",
  posts: "LLM_POSTS",
  cheap: "LLM_CHEAP",
};

const TASK_DEFAULT: Record<LlmTask, string> = {
  cluster: "anthropic:claude-sonnet-5",
  posts: "anthropic:claude-sonnet-5",
  cheap: "anthropic:claude-haiku-4-5",
};

export function buildProvider(spec: string): LlmProvider {
  const sep = spec.indexOf(":");
  const vendor = sep === -1 ? spec : spec.slice(0, sep);
  const model = sep === -1 ? "" : spec.slice(sep + 1);
  if (!model) throw new Error(`spec de LLM inválida: "${spec}" (esperado vendor:modelo)`);
  switch (vendor) {
    case "anthropic":
      return new ClaudeLlmProvider(model);
    case "google":
      return new GeminiLlmProvider(model);
    case "xai":
      return new GrokLlmProvider(model);
    default:
      throw new Error(`vendor de LLM desconhecido: "${vendor}" (use anthropic|google|xai)`);
  }
}

export class RoutedLlmProvider implements LlmProvider {
  private cache = new Map<string, LlmProvider>();

  async complete(req: LlmRequest): Promise<LlmResult> {
    const spec = (process.env[TASK_ENV[req.task]] ?? "").trim() || TASK_DEFAULT[req.task];
    let provider = this.cache.get(spec);
    if (!provider) {
      provider = buildProvider(spec);
      this.cache.set(spec, provider);
    }
    return provider.complete(req);
  }
}
