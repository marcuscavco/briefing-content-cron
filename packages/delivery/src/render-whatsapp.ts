import type { DeliveryBriefing, DeliveryCluster, DeliveryPost } from "./types";

/**
 * Templates da Etapa 8 do SKILL.md, em ATÉ 3 MENSAGENS por categoria
 * (decisão do Marcus): 1) Must-read · 2) Outros assuntos (relevante, no radar,
 * sinais) · 3) Posts sugeridos. Mensagem sem conteúdo não é enviada.
 * REGRAS INEGOCIÁVEIS: título e resumo SEMPRE completos — nunca reticências
 * (decisão do Marcus, 13/07). Para caber no alvo de 1500 chars o corte é
 * estrutural, nesta ordem: fontes extras → seções opcionais → MENOS ITENS
 * (com nota honesta "mais N no painel"). Se um único item completo passar do
 * alvo, a mensagem sai completa mesmo assim (o limite real do WhatsApp é
 * muito maior). Formatação WhatsApp (*negrito*); URLs limpas; PT-BR;
 * silêncio honesto (nunca inflar).
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

/** Item completo: título e resumo INTEIROS — quem cede espaço são fontes extras/itens. */
function renderItem(c: DeliveryCluster, n: number, withHeat: boolean, maxSources = 1): string {
  const marks = `${c.is_curator_pick ? "✨ " : ""}${c.em_alta ? "📈 " : ""}${c.is_update ? "🔁 " : ""}`;
  const item: string[] = [`${n}. ${marks}${c.titulo}`];
  item.push(scoreLine(c, withHeat));
  if (c.fonte && c.url) {
    item.push(`📖 ${c.is_fallback ? "🟡 " : ""}${c.fonte}: ${c.url}`);
    for (const extra of extraSources(c, maxSources - 1)) {
      item.push(`↗ ${extra.portal}: ${extra.url}`);
    }
  }
  if (c.is_update && c.update_resumo) {
    item.push(`🔁 ${c.update_resumo}`);
  } else if (c.resumo) {
    item.push(`💡 ${c.resumo}`);
  }
  return item.join("\n");
}

function maisNoPainel(n: number, oQue: string): string {
  return `➕ Mais ${n} ${oQue} no painel.`;
}

/** Mensagem 1 — Must-read: o que realmente merece leitura hoje. */
function renderMustReadMessage(
  briefing: DeliveryBriefing,
  clusters: DeliveryCluster[],
  briefingUrl?: string,
): string {
  const mustRead = clusters.filter((c) => c.categoria === "must_read");
  const temOutros = clusters.some((c) => c.categoria !== "must_read" && c.categoria !== "descartado");

  const build = (maxSources: number, maxItems: number): string => {
    const shown = mustRead.slice(0, maxItems);
    const omitted = mustRead.length - shown.length;
    const lines: string[] = [`📰 *Briefing ${ddmm(briefing.run_date)}* — 🔥 *Must-read*`];
    if (shown.length) {
      lines.push("");
      lines.push(shown.map((c, i) => renderItem(c, i + 1, true, maxSources)).join("\n\n"));
      if (omitted > 0) lines.push("", maisNoPainel(omitted, `must-read${omitted > 1 ? "s" : ""}`));
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
  };

  // Corte progressivo: fontes extras caem primeiro; depois saem ITENS inteiros
  // (nunca o texto de um item). Ordem da lista = ordem de importância do digest.
  const attempts: [number, number][] = [
    [3, mustRead.length],
    [1, mustRead.length],
  ];
  for (let k = mustRead.length - 1; k >= 1; k--) attempts.push([1, k]);
  for (const [maxSources, maxItems] of attempts) {
    const msg = build(maxSources, maxItems);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return build(1, 1); // 1 item completo, mesmo que passe do alvo — nunca "…"
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

  const build = (includeNoRadar: boolean, maxRelevantes: number, maxSources: number): string => {
    let relevantes = relevantesAll;
    if (relevantes.length > maxRelevantes) {
      relevantes = [...relevantes]
        .sort((a, b) => temaScore(b) - temaScore(a))
        .slice(0, maxRelevantes);
    }
    const omitted = relevantesAll.length - relevantes.length;
    const lines: string[] = [`🗞️ *Outros assuntos ${ddmm(briefing.run_date)}*`];
    let n = 0;
    if (relevantes.length) {
      lines.push("", "📌 *Relevante*", "");
      lines.push(relevantes.map((c) => renderItem(c, ++n, false, maxSources)).join("\n\n"));
      if (omitted > 0) lines.push("", maisNoPainel(omitted, `relevante${omitted > 1 ? "s" : ""}`));
    }
    if (noRadar.length) {
      if (includeNoRadar) {
        lines.push("", "📎 *No radar*");
        for (const c of noRadar) {
          lines.push(`• ${c.titulo} · ${scoreLine(c, false)}`);
        }
      } else {
        lines.push(
          "",
          `📎 No radar: ${noRadar.length} assunto${noRadar.length > 1 ? "s" : ""} no painel.`,
        );
      }
    }
    for (const c of sinais) {
      lines.push(`⚠️ Sinal: ${c.titulo} (sem fonte canônica)`);
    }
    return lines.join("\n");
  };

  // Corte progressivo (SKILL.md): fontes extras → lista do No radar vira
  // contador → sai RELEVANTE inteiro por RELEVANTE inteiro, dos mais fracos
  // para os mais fortes (🎯) — o texto de quem fica nunca encolhe.
  const attempts: [boolean, number, number][] = [
    [true, relevantesAll.length, 3],
    [true, relevantesAll.length, 1],
    [false, relevantesAll.length, 1],
  ];
  for (let k = relevantesAll.length - 1; k >= 1; k--) attempts.push([false, k, 1]);
  for (const [noRadarOn, maxRel, maxSources] of attempts) {
    const msg = build(noRadarOn, maxRel, maxSources);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return build(false, 1, 1); // 1 relevante completo — nunca "…"
}

/** Mensagem 3 — Posts sugeridos. */
export function renderPostsMessage(posts: DeliveryPost[]): string {
  const publicaveis = posts.filter((p) => !p.skip);
  const skips = posts.filter((p) => p.skip);

  if (publicaveis.length === 0) {
    return "📱 *Posts sugeridos*\n\nNenhum assunto central aos temas do briefing rendeu post hoje. Ver digest para leitura pessoal.";
  }

  const build = (maxPosts: number, slidesMax: number, skipCount: number): string => {
    const shown = publicaveis.slice(0, maxPosts);
    const omitted = publicaveis.length - shown.length;
    const lines: string[] = ["📱 *Posts sugeridos* — filtro: relevância ao tema do briefing"];
    shown.forEach((p, i) => {
      const emoji = FORMATO_EMOJI[p.formato ?? ""] ?? "📱";
      const block: string[] = [`${i + 1}. ${p.titulo ?? p.gancho ?? "Post"}`];
      block.push(`${emoji} ${p.formato ?? ""}`);
      if (p.angulo_tipo) {
        block.push(`🎯 Ângulo: ${p.angulo_tipo} — ${p.angulo_descricao ?? ""}`);
      }
      if (p.gancho) {
        block.push(`📣 Hook: "${p.gancho}"`);
      }
      if (p.estrutura?.length && slidesMax > 0) {
        const shownSlides = p.estrutura.slice(0, slidesMax);
        const rest = p.estrutura.length - shownSlides.length;
        const parts = shownSlides.map((s) => `${s.slide}. ${s.texto}`);
        const cont = rest > 0 ? ` (+${rest} slide${rest > 1 ? "s" : ""} no painel)` : "";
        block.push(`🧱 Estrutura: ${parts.join(" · ")}${cont}`);
      }
      lines.push("", block.join("\n"));
    });
    if (omitted > 0) lines.push("", maisNoPainel(omitted, `post${omitted > 1 ? "s" : ""}`));
    const shownSkips = skips.slice(0, skipCount);
    if (shownSkips.length) {
      lines.push("", "⏭️ *Skip hoje:*");
      for (const s of shownSkips) {
        lines.push(`• ${s.titulo ?? "cluster"}: ${s.skip_motivo ?? "skip"}`);
      }
    }
    return lines.join("\n");
  };

  // Corte progressivo: menos slides na prévia (cada slide mostrado é completo,
  // o resto vira "+N no painel") → menos skips → menos POSTS inteiros.
  const attempts: [number, number, number][] = [
    [publicaveis.length, 8, skips.length],
    [publicaveis.length, 4, 2],
    [publicaveis.length, 2, 0],
    [publicaveis.length, 0, 0],
  ];
  for (let k = publicaveis.length - 1; k >= 1; k--) attempts.push([k, 2, 0]);
  for (const [maxPosts, slides, skipCount] of attempts) {
    const msg = build(maxPosts, slides, skipCount);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return build(1, 0, 0); // 1 post completo — nunca "…"
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
