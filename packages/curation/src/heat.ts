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
  mustRead: 6,
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
