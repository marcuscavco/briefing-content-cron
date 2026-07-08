import type { DeliveryBriefing, DeliveryCluster, DeliveryPost } from "./types";

/**
 * Porta fiel dos templates da Etapa 8 do SKILL.md legado.
 * REGRAS INEGOCIÁVEIS: cada mensagem ≤ 1500 chars (hard limit, sempre validado);
 * formatação WhatsApp (*negrito*, sem headers/listas markdown); URLs limpas;
 * PT-BR. Corte progressivo da Mensagem 1 na ordem do SKILL.md:
 * cortar "No radar" → reduzir TL;DRs → cortar Relevantes mais fracos (manter
 * os 2 de maior 💼).
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

interface RenderOptions {
  tldrChars: number;
  includeNoRadar: boolean;
  maxRelevantes: number;
}

function renderDigest(
  briefing: DeliveryBriefing,
  clusters: DeliveryCluster[],
  opts: RenderOptions,
): string {
  const mustRead = clusters.filter((c) => c.categoria === "must_read");
  let relevantes = clusters.filter((c) => c.categoria === "relevante");
  const noRadar = clusters.filter((c) => c.categoria === "no_radar");
  const sinais = clusters.filter((c) => c.categoria === "sinal_sem_fonte");

  if (relevantes.length > opts.maxRelevantes) {
    relevantes = [...relevantes]
      .sort((a, b) => (b.relevancia_empresarial ?? 0) - (a.relevancia_empresarial ?? 0))
      .slice(0, opts.maxRelevantes);
  }

  const total = mustRead.length + relevantes.length + (opts.includeNoRadar ? noRadar.length : 0);
  const lines: string[] = [`📰 *Digest ${ddmm(briefing.run_date)}* — ${total} assuntos`];
  let n = 0;

  const renderItem = (c: DeliveryCluster, withHeat: boolean) => {
    n++;
    const marks = `${c.is_curator_pick ? "✨ " : ""}${c.is_update ? "🔁 " : ""}`;
    const item: string[] = [`${n}. ${marks}${trunc(c.titulo, 70)}`];
    item.push(
      `💼 ${c.relevancia_empresarial ?? 0}/3 · 💻 ${c.relevancia_tecnica ?? 0}/3${withHeat ? ` · Heat ${c.heat_score}` : ""}`,
    );
    if (c.fonte && c.url) {
      item.push(`📖 ${c.is_fallback ? "🟡 " : ""}${c.fonte}: ${c.url}`);
    }
    if (c.is_update && c.update_resumo) {
      item.push(`🔁 ${trunc(c.update_resumo, opts.tldrChars)}`);
    } else if (c.resumo) {
      item.push(`💡 ${trunc(c.resumo, opts.tldrChars)}`);
    }
    return item.join("\n");
  };

  if (mustRead.length) {
    lines.push("", "🔥 *Must-read*", "");
    lines.push(mustRead.map((c) => renderItem(c, true)).join("\n\n"));
  }
  if (relevantes.length) {
    lines.push("", "📌 *Relevante*", "");
    lines.push(relevantes.map((c) => renderItem(c, false)).join("\n\n"));
  }
  if (opts.includeNoRadar && noRadar.length) {
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
  if (briefing.n_suppressed > 0) {
    lines.push(
      "",
      `🤫 ${briefing.n_suppressed} assunto${briefing.n_suppressed > 1 ? "s" : ""} já tratado${briefing.n_suppressed > 1 ? "s" : ""} sem novidade — suprimido${briefing.n_suppressed > 1 ? "s" : ""}.`,
    );
  }
  if (mustRead.length === 0 && relevantes.length === 0) {
    lines.push("", "Sem cobertura relevante no universo monitorado hoje.");
  } else {
    lines.push("", "➡️ Posts sugeridos na próxima mensagem.");
  }

  return lines.join("\n");
}

/** Mensagem 1 — Digest, com corte progressivo até caber em 1500. */
export function renderDigestMessage(
  briefing: DeliveryBriefing,
  clusters: DeliveryCluster[],
): string {
  const attempts: RenderOptions[] = [
    { tldrChars: 100, includeNoRadar: true, maxRelevantes: 99 },
    { tldrChars: 100, includeNoRadar: false, maxRelevantes: 99 }, // corta No radar
    { tldrChars: 60, includeNoRadar: false, maxRelevantes: 99 }, //  reduz TL;DRs
    { tldrChars: 60, includeNoRadar: false, maxRelevantes: 2 }, //   corta Relevantes fracos
    { tldrChars: 40, includeNoRadar: false, maxRelevantes: 2 },
  ];
  for (const opts of attempts) {
    const msg = renderDigest(briefing, clusters, opts);
    if (msg.length <= WHATSAPP_HARD_LIMIT) return msg;
  }
  // Última linha de defesa: nunca estourar o limite hard.
  return trunc(
    renderDigest(briefing, clusters, attempts[attempts.length - 1]!),
    WHATSAPP_HARD_LIMIT,
  );
}

/** Mensagem 2 — Posts sugeridos. */
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

  // Corte progressivo da Mensagem 2 (SKILL.md): encurtar estruturas → hooks → skips
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
