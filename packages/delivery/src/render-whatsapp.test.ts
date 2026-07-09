import { describe, expect, it } from "vitest";
import { renderPostsMessage, renderWhatsappMessages, WHATSAPP_HARD_LIMIT } from "./render-whatsapp";
import type { DeliveryBriefing, DeliveryCluster, DeliveryPost } from "./types";

const briefing: DeliveryBriefing = {
  id: "b1",
  run_date: "2026-07-08",
  n_must_read: 3,
  n_relevante: 3,
  n_no_radar: 5,
  n_suppressed: 2,
  n_updates: 1,
};

function cluster(over: Partial<DeliveryCluster>): DeliveryCluster {
  return {
    titulo: "Título de teste bastante descritivo sobre tecnologia e negócios",
    resumo: "Resumo do assunto com o fato central e por que importa para quem decide numa empresa brasileira de tecnologia.",
    categoria: "relevante",
    heat_score: 4,
    relevancia_tecnica: 2,
    relevancia_empresarial: 2,
    fonte: "The Information",
    url: "https://www.theinformation.com/articles/exemplo",
    is_fallback: false,
    is_curator_pick: false,
    is_update: false,
    update_resumo: null,
    ...over,
  };
}

function bigDataset(): DeliveryCluster[] {
  const out: DeliveryCluster[] = [];
  for (let i = 0; i < 5; i++) out.push(cluster({ categoria: "must_read", heat_score: 7, titulo: `Must-read número ${i + 1} com título comprido para estressar o limite de caracteres da mensagem` }));
  for (let i = 0; i < 6; i++) out.push(cluster({ categoria: "relevante", relevancia_empresarial: (i % 4) as 0 | 1 | 2 | 3, titulo: `Relevante número ${i + 1} com título igualmente comprido para o teste de corte progressivo do digest` }));
  for (let i = 0; i < 8; i++) out.push(cluster({ categoria: "no_radar", heat_score: 2, titulo: `No radar item ${i + 1} título longo` }));
  out.push(cluster({ categoria: "sinal_sem_fonte", fonte: null, url: null }));
  return out;
}

function post(over: Partial<DeliveryPost>): DeliveryPost {
  return {
    titulo: "Post sobre o assunto do dia",
    formato: "Carrossel",
    gancho: "Você viu o que aconteceu com o mercado de IA hoje? Isso muda o jogo para o seu negócio nos próximos meses.",
    estrutura: Array.from({ length: 8 }, (_, i) => ({ slide: i + 1, texto: `Slide ${i + 1} com um texto razoavelmente longo` })),
    angulo_tipo: "traducao_empresario",
    angulo_descricao: "o que muda na prática para o dono de PME",
    skip: false,
    skip_motivo: null,
    ...over,
  };
}

describe("renderWhatsappMessages (3 mensagens por categoria)", () => {
  it("separa em must-read, outros assuntos e posts — TODAS ≤ 1500", () => {
    const msgs = renderWhatsappMessages(briefing, bigDataset(), [post({})]);
    expect(msgs).toHaveLength(3);
    expect(msgs[0]).toContain("🔥 *Must-read*");
    expect(msgs[0]).not.toContain("📌 *Relevante*");
    expect(msgs[1]).toContain("🗞️ *Outros assuntos");
    expect(msgs[1]).toContain("📌 *Relevante*");
    expect(msgs[1]).not.toContain("Must-read número");
    expect(msgs[2]).toContain("📱 *Posts sugeridos*");
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
  });

  it("sem outros assuntos → só 2 mensagens (nada de mensagem vazia)", () => {
    const msgs = renderWhatsappMessages(briefing, [cluster({ categoria: "must_read" })], [post({})]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toContain("Must-read");
    expect(msgs[1]).toContain("Posts sugeridos");
  });

  it("sinal sem fonte vai na mensagem de outros assuntos, sem link", () => {
    const msgs = renderWhatsappMessages(
      briefing,
      [cluster({ categoria: "must_read" }), cluster({ categoria: "sinal_sem_fonte", fonte: null, url: null })],
      [],
    );
    expect(msgs[1]).toContain("⚠️ Sinal:");
    expect(msgs[1]).toContain("sem fonte canônica");
  });

  it("silêncio honesto: nada relevante → diz isso, sem inflar", () => {
    const silent: DeliveryBriefing = { ...briefing, n_suppressed: 0 };
    const msgs = renderWhatsappMessages(silent, [], []);
    expect(msgs).toHaveLength(2); // must-read (vazio honesto) + posts (vazio honesto)
    expect(msgs[0]).toContain("Sem cobertura relevante no universo monitorado hoje.");
    expect(msgs[1]).toContain("Nenhum cluster passou o filtro empresarial hoje.");
  });

  it("assuntos suprimidos pela memória aparecem no rodapé do must-read", () => {
    const msgs = renderWhatsappMessages(briefing, [cluster({ categoria: "must_read" })], []);
    expect(msgs[0]).toContain("🤫 2 assuntos já tratados sem novidade — suprimidos.");
  });

  it("cluster Atualização mostra 🔁 e o que mudou", () => {
    const msgs = renderWhatsappMessages(
      briefing,
      [cluster({ categoria: "must_read", is_update: true, update_resumo: "Escopo caiu para 50% do anunciado." })],
      [],
    );
    expect(msgs[0]).toContain("🔁");
    expect(msgs[0]).toContain("Escopo caiu para 50%");
  });

  it("curator's pick ✨ e fallback 🟡 marcados", () => {
    const msgs = renderWhatsappMessages(
      briefing,
      [cluster({ categoria: "must_read", is_curator_pick: true, is_fallback: true })],
      [],
    );
    expect(msgs[0]).toContain("✨");
    expect(msgs[0]).toContain("🟡");
  });

  it("sem markdown proibido (headers e listas com hífen)", () => {
    for (const m of renderWhatsappMessages(briefing, bigDataset(), [post({})])) {
      expect(m).not.toMatch(/^#/m);
      expect(m).not.toMatch(/^- /m);
    }
  });
});

describe("renderPostsMessage", () => {
  it("SEMPRE ≤ 1500 mesmo com muitos posts e skips", () => {
    const many = [
      ...Array.from({ length: 5 }, (_, i) => post({ titulo: `Post número ${i + 1} com título comprido de teste` })),
      ...Array.from({ length: 6 }, (_, i) =>
        post({ skip: true, titulo: `Skip ${i + 1}`, skip_motivo: "relevância empresarial 1/3 — não traduz em conteúdo útil" }),
      ),
    ];
    expect(renderPostsMessage(many).length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
  });

  it("mostra formato, ângulo, hook e estrutura", () => {
    const msg = renderPostsMessage([post({})]);
    expect(msg).toContain("🎠 Carrossel");
    expect(msg).toContain("🎯 Ângulo:");
    expect(msg).toContain("📣 Hook:");
    expect(msg).toContain("🧱 Estrutura:");
  });
});
