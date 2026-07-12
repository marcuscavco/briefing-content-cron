import type { FetchedItem } from "@briefing/ingestion";

/** Item coletado, anotado com a fonte de origem (shape que entra na clusterização). */
export interface CollectedItem extends FetchedItem {
  sourceId: string;
  portal: string; // nome da fonte
  tier: 1 | 2 | 3;
  country?: string | null;
}

/** Saída da etapa de clusterização+notas (LLM) — antes de heat/seleção/memória. */
export interface RawCluster {
  titulo: string;
  resumo: string;
  entidades: string[];
  itemIndices: number[]; // índices em CollectedItem[]
  relevanciaTema: 0 | 1 | 2 | 3; // 🎯 central aos temas DESTE briefing
  impactoGeral: 0 | 1 | 2 | 3; // ⚡ tamanho intrínseco do fato, independente do tema
  anguloPraticoClaro: boolean;
  dataEvento: string | null; // AAAA-MM-DD
}

export type ClusterCategoria =
  | "must_read"
  | "relevante"
  | "no_radar"
  | "sinal_sem_fonte"
  | "descartado"
  | "suprimido";

export type MemoryDecision = "novo" | "atualizacao" | "suprimir";

/** Cluster totalmente processado, pronto para persistir. */
export interface ProcessedCluster extends RawCluster {
  heat: number; // heat final (base + boost de recorrência arredondado)
  heatBoost: number; // boost de recorrência aplicado (0 quando não é atualização)
  emAlta: boolean; // badge "Em alta" (boost ≥ badgeThreshold e não suprimido)
  categoria: ClusterCategoria;
  portaisCobrindo: string[];
  fonte: string | null;
  url: string | null;
  tierFonte: 1 | 2 | null;
  isFallback: boolean;
  isCuratorPick: boolean;
  curatorPickMotivo: string | null;
  // memória
  memoryDecision: MemoryDecision;
  updateResumo: string | null;
  previousBriefingId: string | null;
  topicMemoryId: string | null;
}

export interface PostSuggestion {
  clusterIndex: number;
  formato: string;
  justificativaFormato: string;
  gancho: string;
  estrutura: { slide: number; texto: string }[];
  cta: string;
  anguloTipo: string;
  anguloDescricao: string;
  skip: boolean;
  skipMotivo: string | null;
}

export interface SourceRow {
  id: string;
  name: string;
  type: "rss" | "web" | "instagram";
  url: string;
  feed_url: string | null;
  handle: string | null;
  tier: number;
  active: boolean;
  credential_enc: string | null;
  fallback_eligible?: boolean;
}

export interface ProfileConfig {
  id: string;
  accountId: string;
  themes: string[];
  excludedThemes: string[];
  windowHours: number;
  maxPostsPerDay: number;
  timezone: string;
  channels: unknown; // {"email": bool, "whatsapp": bool}
  voiceOverrides: unknown;
}

/** Checkpoint persistido em jobs.checkpoint entre estágios. */
export interface PipelineCheckpoint {
  items?: CollectedItem[];
  sourceReport?: {
    sourceId: string;
    portal: string;
    status: string;
    itemsFound: number;
    error?: string;
  }[];
  rawClusters?: RawCluster[];
  processed?: ProcessedCluster[];
  posts?: PostSuggestion[];
  briefingId?: string;
}

export const STAGES = [
  "collect",
  "cluster",
  "memory",
  "select",
  "posts",
  "persist",
  "deliver",
  "report",
] as const;

export type Stage = (typeof STAGES)[number];

export interface StageMetrics {
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}
