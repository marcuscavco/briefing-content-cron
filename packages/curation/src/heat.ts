import type { ClusterCategoria, CollectedItem, RawCluster } from "./types";

/**
 * Heat Score — regra de convergência preservada do legado (references/pontuacao.md):
 *   +2 por portal Tier 1 cobrindo, +1 por Tier 2, +0.5 por Tier 3 (peso menor —
 *   Tier 3 é contexto/descoberta, nunca fonte canônica), +1 bônus se 3+ portais BR.
 *   (Bônus HN 200+ pts fica de fora do v1: o feed via hnrss não expõe score.)
 * Faixas: ≥6 must_read · 3-5 relevante · 2 no_radar · <2 descartado.
 * Pesos configuráveis por plano/usuário chegam na Fase 6 — defaults = legado.
 */
export interface HeatWeights {
  tier1: number;
  tier2: number;
  tier3: number;
  brBonusThreshold: number;
  brBonus: number;
  mustRead: number;
  relevante: number;
  noRadar: number;
}

export const DEFAULT_WEIGHTS: HeatWeights = {
  tier1: 2,
  tier2: 1,
  tier3: 0.5,
  brBonusThreshold: 3,
  brBonus: 1,
  // mustRead era 6, calibrado para clusters guarda-chuva (que somavam portais
  // de fatos distintos). Com granularidade por história (2026-07-13), a
  // convergência é honesta e mais rara: 4 ≈ 2 portais Tier 1 no MESMO fato.
  mustRead: 4,
  relevante: 3,
  noRadar: 2,
};

export function computeHeat(
  cluster: RawCluster,
  items: CollectedItem[],
  weights: HeatWeights = DEFAULT_WEIGHTS,
): { heat: number; portais: string[] } {
  const portals = new Map<string, { tier: number; country?: string | null }>();
  for (const idx of cluster.itemIndices) {
    const item = items[idx];
    if (!item) continue;
    const existing = portals.get(item.portal);
    // Se o mesmo portal aparece em tiers diferentes (improvável), fica o menor tier
    if (!existing || item.tier < existing.tier) {
      portals.set(item.portal, { tier: item.tier, country: item.country });
    }
  }

  let heat = 0;
  let brCount = 0;
  for (const { tier, country } of portals.values()) {
    if (tier === 1) heat += weights.tier1;
    else if (tier === 2) heat += weights.tier2;
    else heat += weights.tier3;
    if (country === "BR") brCount++;
  }
  if (brCount >= weights.brBonusThreshold) heat += weights.brBonus;

  return { heat: Math.floor(heat), portais: [...portals.keys()] };
}

export function categorize(heat: number, weights: HeatWeights = DEFAULT_WEIGHTS): ClusterCategoria {
  if (heat >= weights.mustRead) return "must_read";
  if (heat >= weights.relevante) return "relevante";
  if (heat >= weights.noRadar) return "no_radar";
  return "descartado";
}

/**
 * Boost de recorrência ("Em alta") — assuntos são a entidade central: quando um
 * assunto já entregue reaparece COM novidade material, ganha bônus no heat
 * (pode subir de categoria); dias reaparecendo SEM novidade e tempo parado
 * decaem o bônus ("volta mais frio"). Determinístico — zero LLM.
 * Só se aplica a decisão "atualização"; supressão e assunto novo não boostam.
 */
export interface TrendState {
  noveltyStreak: number; // topic_memory.novelty_streak — aparições consecutivas COM novidade
  staleDays: number; // topic_memory.stale_days — reaparições sem novidade desde a última novidade
  lastNovelAt: string; // topic_memory.last_novel_at (ISO)
}

export interface TrendWeights {
  updateBoostBase: number; // reaparecer com novidade material
  streakStep: number; // por atualização consecutiva anterior
  streakCap: number; // teto de streak considerado
  staleDecayPerDay: number; // por reaparição sem novidade acumulada
  timeDecayPerDay: number; // por dia corrido sem novidade além da carência
  timeGraceDays: number;
  minBoost: number; // penalidade máxima ("volta mais frio")
  maxBoost: number; // nunca mais que ~1 categoria de salto garantido
  badgeThreshold: number; // boost ≥ isto ⇒ badge "Em alta"
}

export const DEFAULT_TREND: TrendWeights = {
  updateBoostBase: 2,
  streakStep: 1,
  streakCap: 3,
  staleDecayPerDay: 1,
  timeDecayPerDay: 0.5,
  timeGraceDays: 2,
  minBoost: -1,
  maxBoost: 3,
  badgeThreshold: 1,
};

const MS_PER_DAY = 86_400_000;

export function computeTrendBoost(
  state: TrendState,
  now: Date,
  weights: TrendWeights = DEFAULT_TREND,
): number {
  const lastNovelMs = Date.parse(state.lastNovelAt);
  const daysSinceNovel = Number.isNaN(lastNovelMs)
    ? 0
    : Math.max(0, Math.floor((now.getTime() - lastNovelMs) / MS_PER_DAY));
  const raw =
    weights.updateBoostBase +
    weights.streakStep * Math.min(Math.max(state.noveltyStreak - 1, 0), weights.streakCap - 1) -
    weights.staleDecayPerDay * state.staleDays -
    weights.timeDecayPerDay * Math.max(0, daysSinceNovel - weights.timeGraceDays);
  return Math.min(weights.maxBoost, Math.max(weights.minBoost, raw));
}
