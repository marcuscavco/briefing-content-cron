/**
 * Embeddings para a memória semântica (decisão do usuário: Voyage AI).
 * Interface isolada — trocar de provedor é trocar uma classe.
 * voyage-3.5-lite @ 1024 dims (precisa bater com vector(1024) do schema).
 */

export const EMBEDDING_DIMS = 1024;

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class VoyageEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly apiKey = process.env.VOYAGE_API_KEY,
    private readonly model = "voyage-3.5-lite",
  ) {
    if (!this.apiKey) throw new Error("VOYAGE_API_KEY não configurada");
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        output_dimension: EMBEDDING_DIMS,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new Error(`Voyage API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const body = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}

/**
 * Fallback determinístico (dev/teste, sem API): hashing de n-gramas de
 * caracteres em 1024 dims, normalizado. Similaridade é lexical, não semântica —
 * suficiente para testar a MECÂNICA novo/atualização/suprimir.
 */
export class HashEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => hashEmbed(t));
  }
}

function hashEmbed(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIMS);
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const n = 3;
  for (let i = 0; i <= normalized.length - n; i++) {
    const gram = normalized.slice(i, i + n);
    let h = 2166136261;
    for (let j = 0; j < gram.length; j++) {
      h ^= gram.charCodeAt(j);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % EMBEDDING_DIMS;
    vec[idx] = (vec[idx] ?? 0) + 1;
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}
