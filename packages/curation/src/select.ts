import type { CollectedItem, ProcessedCluster, RawCluster, SourceRow } from "./types";
import type { ClusterCategoria } from "./types";

/**
 * Etapa 4 do SKILL.md — seleção de fonte canônica + Curator's Pick, portada
 * como código determinístico:
 * 1. Tier 1 cobrindo → canônico (prioridade = ordem de cadastro das fontes).
 * 2. Must-read OU Relevante sem Tier 1 → 1 fallback Tier 2 elegível, marcado.
 * 3. Sem elegível → sinal sem fonte canônica.
 * Tier 3 NUNCA vira link (princípio do brief). Fontes com fallback_eligible=false
 * (ex.: Hacker News — agregador) contam para heat mas nunca são leitura.
 * Curator's Pick: até 2 promoções/dia — 💼≥3 · scoop Tier 1 com 💼≥2 · 💻≥3 com
 * ângulo prático e 💼≥2. Promove categoria; não muda heat/notas.
 */

interface SelectInput {
  cluster: RawCluster;
  heat: number;
  categoria: ClusterCategoria;
  portais: string[];
}

export function selectSources(
  clusters: SelectInput[],
  items: CollectedItem[],
  sources: SourceRow[],
): Omit<
  ProcessedCluster,
  "memoryDecision" | "updateResumo" | "previousBriefingId" | "topicMemoryId" | "heatBoost" | "emAlta"
>[] {
  const sourceByName = new Map(sources.map((s) => [s.name, s]));

  const withSelection = clusters.map(({ cluster, heat, categoria, portais }) => {
    let fonte: string | null = null;
    let url: string | null = null;
    let tierFonte: 1 | 2 | null = null;
    let isFallback = false;

    const clusterItems = cluster.itemIndices
      .map((i) => items[i])
      .filter((i): i is CollectedItem => Boolean(i));

    const pickItem = (tier: number, requireEligible: boolean): CollectedItem | null => {
      for (const item of clusterItems) {
        if (item.tier !== tier) continue;
        const src = sourceByName.get(item.portal);
        if (requireEligible && src && src.fallback_eligible === false) continue;
        return item;
      }
      return null;
    };

    const needsSource = categoria === "must_read" || categoria === "relevante";
    if (needsSource) {
      const tier1 = pickItem(1, false);
      if (tier1) {
        fonte = tier1.portal;
        url = cleanUrl(tier1.url);
        tierFonte = 1;
      } else {
        const tier2 = pickItem(2, true);
        if (tier2) {
          fonte = tier2.portal;
          url = cleanUrl(tier2.url);
          tierFonte = 2;
          isFallback = true;
        }
        // sem Tier 1 e sem Tier 2 elegível → sinal sem fonte
      }
    }

    const finalCategoria: ClusterCategoria =
      needsSource && !fonte ? "sinal_sem_fonte" : categoria;

    return {
      ...cluster,
      heat,
      categoria: finalCategoria,
      portaisCobrindo: portais,
      fonte,
      url,
      tierFonte,
      isFallback,
      isCuratorPick: false,
      curatorPickMotivo: null as string | null,
    };
  });

  // Curator's Pick — máx 2 promoções; descartado não é elegível (não cria, só promove)
  const PROMOTE: Record<string, ClusterCategoria> = {
    no_radar: "relevante",
    relevante: "must_read",
  };

  const candidates = withSelection
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.categoria === "no_radar" || c.categoria === "relevante")
    .map(({ c, i }) => {
      const tier1Portals = c.portaisCobrindo.filter((p) => sourceByName.get(p)?.tier === 1);
      const isScoop = tier1Portals.length === 1 && c.portaisCobrindo.length === 1;
      let motivo: string | null = null;
      if (c.relevanciaEmpresarial >= 3) motivo = "💼≥3 impacto empresarial sistêmico";
      else if (isScoop && c.relevanciaEmpresarial >= 2) motivo = "scoop exclusivo Tier 1";
      else if (c.relevanciaTecnica >= 3 && c.anguloPraticoClaro && c.relevanciaEmpresarial >= 2)
        motivo = "💻≥3 com ângulo prático claro";
      return { c, i, motivo };
    })
    .filter((x): x is { c: (typeof withSelection)[0]; i: number; motivo: string } =>
      Boolean(x.motivo),
    )
    // desempate do SKILL.md: maior 💼 primeiro
    .sort((a, b) => b.c.relevanciaEmpresarial - a.c.relevanciaEmpresarial)
    .slice(0, 2);

  for (const { c, motivo } of candidates) {
    const promoted = PROMOTE[c.categoria];
    if (!promoted) continue;
    c.categoria = promoted;
    c.isCuratorPick = true;
    c.curatorPickMotivo = motivo;
  }

  return withSelection;
}

/** URLs entregues são sempre limpas (princípio não-negociável). */
export function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const strip = [...url.searchParams.keys()].filter(
      (k) => k.startsWith("utm_") || ["ref", "source", "guccounter", "fbclid", "gclid", "token"].includes(k),
    );
    for (const k of strip) url.searchParams.delete(k);
    return url.toString();
  } catch {
    return raw;
  }
}
