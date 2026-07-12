import type { DeliveryBriefing, DeliveryCluster, DeliveryPost } from "./types";

/**
 * Templates da Etapa 8 do SKILL.md, agora em ATÉ 3 MENSAGENS por categoria
 * (decisão do Marcus): 1) Must-read · 2) Outros assuntos (relevante, no radar,
 * sinais) · 3) Posts sugeridos. Mensagem sem conteúdo não é enviada.
 * REGRAS INEGOCIÁVEIS: cada mensagem ≤ 1500 chars (hard limit, sempre
 * validado); formatação WhatsApp (*negrito*); URLs limpas; PT-BR; silêncio
 * honesto (nunca inflar).
 */

export const WHATSAPP_HARD_LIMIT = 1500;

const FORMATO_EMOJI: Record<string, string> = {
  Reels: "🎥",
  Carrossel: "🎠",
  Infográfico: "📊",
  "Post longo": "📝",
  "Vídeo longo": "🎙️",
};

function ddmm(runDate: string): string {
  const [, m, d] = runDate.split("-");
  return `${d}/${m}`;
}

function trunc(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

function fit(
  build: (tldr: number, maxSources: number) => string,
  steps: [number, number][] = [
    [100, 3],
    [100, 1],
    [60, 1],
    [40, 1],
  ],
): string {
  for (const [tldr, maxSources] of steps) {
    const msg = build(tldr, maxSources);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  const last = steps[steps.length - 1]!;
  return trunc(build(last[0], last[1]), WHATSAPP_HARD_LIMIT);
}

/**
 * Fontes extras do assunto (além da canônica): portais distintos, Tier 1/2
 * apenas (Tier 3 nunca vira link — rows antigas sem tier ficam de fora).
 */
function extraSources(c: DeliveryCluster, max: number): { portal: string; url: string }[] {
  if (max <= 0 || !c.fonte || !c.url || !Array.isArray(c.itens)) return [];
  const seen = new Set([c.fonte]);
  const extras: { portal: string; url: string }[] = [];
  for (const item of c.itens) {
    if (extras.length >= max) break;
    if (!item?.portal || !item.url || item.url === c.url || seen.has(item.portal)) continue;
    if (item.tier !== 1 && item.tier !== 2) continue;
    seen.add(item.portal);
    extras.push({ portal: item.portal, url: item.url });
  }
  return extras;
}

/** Nota 🎯 do cluster, com fallback para 💼 nos briefings antigos (pré-2026-07-13). */
function temaScore(c: DeliveryCluster): number {
  return c.relevancia_tema ?? c.relevancia_empresarial ?? 0;
}

/**
 * Linha de notas: scoring novo `🎯 Tema x/3 · ⚡ y/3 · 🔥 N portais` (cobertura
 * substitui o jargão "Heat N"); briefings antigos mantêm o formato 💼/💻.
 */
function scoreLine(c: DeliveryCluster, withCoverage: boolean): string {
  if (c.relevancia_tema == null && c.relevancia_empresarial != null) {
    return `💼 ${c.relevancia_empresarial}/3 · 💻 ${c.relevancia_tecnica ?? 0}/3`;
  }
  const portais = Array.isArray(c.portais_cobrindo) ? c.portais_cobrindo.length : 0;
  const coverage =
    withCoverage && portais > 0 ? ` · 🔥 ${portais} ${portais === 1 ? "portal" : "portais"}` : "";
  return `🎯 Tema ${c.relevancia_tema ?? 0}/3 · ⚡ ${c.impacto_geral ?? 0}/3${coverage}`;
}

function renderItem(
  c: DeliveryCluster,
  n: number,
  tldrChars: number,
  withHeat: boolean,
  maxSources = 1,
): string {
  const marks = `${c.is_curator_pick ? "✨ " : ""}${c.em_alta ? "📈 " : ""}${c.is_update ? "🔁 " : ""}`;
  const item: string[] = [`${n}. ${marks}${trunc(c.titulo, 70)}`];
  item.push(scoreLine(c, withHeat));
  if (c.fonte && c.url) {
    item.push(`📖 ${c.is_fallback ? "🟡 " : ""}${c.fonte}: ${c.url}`);
    for (const extra of extraSources(c, maxSources - 1)) {
      item.push(`↗ ${extra.portal}: ${extra.url}`);
    }
  }
  if (c.is_update && c.update_resumo) {
    item.push(`🔁 ${trunc(c.update_resumo, tldrChars)}`);
  } else if (c.resumo) {
    item.push(`💡 ${trunc(c.resumo, tldrChars)}`);
  }
  return item.join("\n");
}

/** Mensagem 1 — Must-read: o que realmente merece leitura hoje. */
function renderMustReadMessage(
  briefing: DeliveryBriefing,
  clusters: DeliveryCluster[],
  briefingUrl?: string,
): string {
  const mustRead = clusters.filter((c) => c.categoria === "must_read");
  const temOutros = clusters.some((c) => c.categoria !== "must_read" && c.categoria !== "descartado");

  // Corte progressivo: fontes extras caem ANTES de encurtar TL;DRs
  return fit((tldr, maxSources) => {
    const lines: string[] = [`📰 *Briefing ${ddmm(briefing.run_date)}* — 🔥 *Must-read*`];
    if (mustRead.length) {
      lines.push("");
      lines.push(mustRead.map((c, i) => renderItem(c, i + 1, tldr, true, maxSources)).join("\n\n"));
    } else if (temOutros) {
      lines.push("", "Nenhum must-read hoje — os assuntos do dia vão na próxima mensagem.");
    } else {
      lines.push("", "Sem cobertura relevante no universo monitorado hoje.");
    }
    if (briefing.n_suppressed > 0) {
      lines.push(
        "",
        `🤫 ${briefing.n_suppressed} assunto${briefing.n_suppressed > 1 ? "s" : ""} já tratado${briefing.n_suppressed > 1 ? "s" : ""} sem novidade — suprimido${briefing.n_suppressed > 1 ? "s" : ""}.`,
      );
    }
    if (briefingUrl) {
      // Link inteligente: hoje abre o dashboard; antigo abre o arquivo do dia.
      lines.push("", `🔗 Ver no painel: ${briefingUrl}`);
    }
    return lines.join("\n");
  });
}

/** Mensagem 2 — Outros assuntos: relevantes, no radar e sinais sem fonte. */
function renderOthersMessage(
  briefing: DeliveryBriefing,
  clusters: DeliveryCluster[],
): string | null {
  const relevantesAll = clusters.filter((c) => c.categoria === "relevante");
  const noRadar = clusters.filter((c) => c.categoria === "no_radar");
  const sinais = clusters.filter((c) => c.categoria === "sinal_sem_fonte");
  if (relevantesAll.length === 0 && noRadar.length === 0 && sinais.length === 0) return null;

  const build = (
    tldr: number,
    includeNoRadar: boolean,
    maxRelevantes: number,
    maxSources: number,
  ): string => {
    let relevantes = relevantesAll;
    if (relevantes.length > maxRelevantes) {
      relevantes = [...relevantes]
        .sort((a, b) => temaScore(b) - temaScore(a))
        .slice(0, maxRelevantes);
    }
    const lines: string[] = [`🗞️ *Outros assuntos ${ddmm(briefing.run_date)}*`];
    let n = 0;
    if (relevantes.length) {
      lines.push("", "📌 *Relevante*", "");
      lines.push(relevantes.map((c) => renderItem(c, ++n, tldr, false, maxSources)).join("\n\n"));
    }
    if (includeNoRadar && noRadar.length) {
      lines.push("", "📎 *No radar*");
      for (const c of noRadar) {
        lines.push(`• ${trunc(c.titulo, 60)} · ${scoreLine(c, false)}`);
      }
    }
    for (const c of sinais) {
      lines.push(`⚠️ Sinal: ${trunc(c.titulo, 70)} (sem fonte canônica)`);
    }
    return lines.join("\n");
  };

  // Corte progressivo (SKILL.md): cortar fontes extras → No radar → reduzir
  // TL;DRs → cortar Relevantes mais fracos mantendo os 2 de maior 💼.
  const attempts: [number, boolean, number, number][] = [
    [100, true, 99, 3],
    [100, true, 99, 1],
    [100, false, 99, 1],
    [60, false, 99, 1],
    [60, false, 2, 1],
    [40, false, 2, 1],
  ];
  for (const [tldr, noRadarOn, maxRel, maxSources] of attempts) {
    const msg = build(tldr, noRadarOn, maxRel, maxSources);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return trunc(build(40, false, 2, 1), WHATSAPP_HARD_LIMIT);
}

/** Mensagem 3 — Posts sugeridos. */
export function renderPostsMessage(posts: DeliveryPost[]): string {
  const publicaveis = posts.filter((p) => !p.skip);
  const skips = posts.filter((p) => p.skip);

  if (publicaveis.length === 0) {
    return "📱 *Posts sugeridos*\n\nNenhum assunto central aos temas do briefing rendeu post hoje. Ver digest para leitura pessoal.";
  }

  const build = (estruturaMax: number, hookWords: number, skipCount: number): string => {
    const lines: string[] = ["📱 *Posts sugeridos* — filtro: relevância ao tema do briefing"];
    publicaveis.forEach((p, i) => {
      const emoji = FORMATO_EMOJI[p.formato ?? ""] ?? "📱";
      const block: string[] = [`${i + 1}. ${trunc(p.titulo ?? p.gancho ?? "Post", 60)}`];
      block.push(`${emoji} ${p.formato ?? ""}`);
      if (p.angulo_tipo) {
        block.push(`🎯 Ângulo: ${p.angulo_tipo} — ${trunc(p.angulo_descricao ?? "", 80)}`);
      }
      if (p.gancho) {
        const words = p.gancho.split(/\s+/).slice(0, hookWords).join(" ");
        block.push(`📣 Hook: "${words}"`);
      }
      if (p.estrutura?.length) {
        const parts = p.estrutura
          .slice(0, estruturaMax)
          .map((s) => `${s.slide}.${trunc(s.texto, 24)}`);
        block.push(`🧱 Estrutura: ${parts.join(" · ")}`);
      }
      lines.push("", block.join("\n"));
    });
    const shownSkips = skips.slice(0, skipCount);
    if (shownSkips.length) {
      lines.push("", "⏭️ *Skip hoje:*");
      for (const s of shownSkips) {
        lines.push(`• ${trunc(s.titulo ?? "cluster", 40)}: ${trunc(s.skip_motivo ?? "skip", 50)}`);
      }
    }
    return lines.join("\n");
  };

  // Corte progressivo (SKILL.md): encurtar estruturas → hooks → skips
  const attempts: [number, number, number][] = [
    [8, 15, skips.length],
    [5, 15, skips.length],
    [4, 10, 2],
    [3, 8, 0],
  ];
  for (const [estrutura, hook, skipCount] of attempts) {
    const msg = build(estrutura, hook, skipCount);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return trunc(build(3, 8, 0), WHATSAPP_HARD_LIMIT);
}

/**
 * O briefing completo em até 3 mensagens, na ordem de envio:
 * Must-read · Outros assuntos (se houver) · Posts sugeridos.
 */
export function renderWhatsappMessages(
  briefing: DeliveryBriefing,
  clusters: DeliveryCluster[],
  posts: DeliveryPost[],
  opts?: { briefingUrl?: string },
): string[] {
  const messages = [renderMustReadMessage(briefing, clusters, opts?.briefingUrl)];
  const others = renderOthersMessage(briefing, clusters);
  if (others) messages.push(others);
  messages.push(renderPostsMessage(posts));
  return messages;
}
