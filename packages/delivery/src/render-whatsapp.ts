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

function fit(build: (tldr: number) => string, tldrSteps = [100, 60, 40]): string {
  for (const tldr of tldrSteps) {
    const msg = build(tldr);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return trunc(build(tldrSteps[tldrSteps.length - 1]!), WHATSAPP_HARD_LIMIT);
}

function renderItem(c: DeliveryCluster, n: number, tldrChars: number, withHeat: boolean): string {
  const marks = `${c.is_curator_pick ? "✨ " : ""}${c.is_update ? "🔁 " : ""}`;
  const item: string[] = [`${n}. ${marks}${trunc(c.titulo, 70)}`];
  item.push(
    `💼 ${c.relevancia_empresarial ?? 0}/3 · 💻 ${c.relevancia_tecnica ?? 0}/3${withHeat ? ` · Heat ${c.heat_score}` : ""}`,
  );
  if (c.fonte && c.url) {
    item.push(`📖 ${c.is_fallback ? "🟡 " : ""}${c.fonte}: ${c.url}`);
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

  return fit((tldr) => {
    const lines: string[] = [`📰 *Briefing ${ddmm(briefing.run_date)}* — 🔥 *Must-read*`];
    if (mustRead.length) {
      lines.push("");
      lines.push(mustRead.map((c, i) => renderItem(c, i + 1, tldr, true)).join("\n\n"));
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

  const build = (tldr: number, includeNoRadar: boolean, maxRelevantes: number): string => {
    let relevantes = relevantesAll;
    if (relevantes.length > maxRelevantes) {
      relevantes = [...relevantes]
        .sort((a, b) => (b.relevancia_empresarial ?? 0) - (a.relevancia_empresarial ?? 0))
        .slice(0, maxRelevantes);
    }
    const lines: string[] = [`🗞️ *Outros assuntos ${ddmm(briefing.run_date)}*`];
    let n = 0;
    if (relevantes.length) {
      lines.push("", "📌 *Relevante*", "");
      lines.push(relevantes.map((c) => renderItem(c, ++n, tldr, false)).join("\n\n"));
    }
    if (includeNoRadar && noRadar.length) {
      lines.push("", "📎 *No radar*");
      for (const c of noRadar) {
        lines.push(
          `• ${trunc(c.titulo, 60)} · 💼 ${c.relevancia_empresarial ?? 0} · 💻 ${c.relevancia_tecnica ?? 0}`,
        );
      }
    }
    for (const c of sinais) {
      lines.push(`⚠️ Sinal: ${trunc(c.titulo, 70)} (sem fonte canônica)`);
    }
    return lines.join("\n");
  };

  // Corte progressivo (SKILL.md): cortar No radar → reduzir TL;DRs → cortar
  // Relevantes mais fracos mantendo os 2 de maior 💼.
  const attempts: [number, boolean, number][] = [
    [100, true, 99],
    [100, false, 99],
    [60, false, 99],
    [60, false, 2],
    [40, false, 2],
  ];
  for (const [tldr, noRadarOn, maxRel] of attempts) {
    const msg = build(tldr, noRadarOn, maxRel);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  return trunc(build(40, false, 2), WHATSAPP_HARD_LIMIT);
}

/** Mensagem 3 — Posts sugeridos. */
export function renderPostsMessage(posts: DeliveryPost[]): string {
  const publicaveis = posts.filter((p) => !p.skip);
  const skips = posts.filter((p) => p.skip);

  if (publicaveis.length === 0) {
    return "📱 *Posts sugeridos*\n\nNenhum cluster passou o filtro empresarial hoje. Ver digest para leitura pessoal.";
  }

  const build = (estruturaMax: number, hookWords: number, skipCount: number): string => {
    const lines: string[] = ["📱 *Posts sugeridos* — filtro: relevância empresarial"];
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
