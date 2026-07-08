import { describe, expect, it } from "vitest";
import { renderDigestMessage, renderPostsMessage, WHATSAPP_HARD_LIMIT } from "./render-whatsapp";
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
  for (let i = 0; i < 3; i++) out.push(cluster({ categoria: "must_read", heat_score: 7, titulo: `Must-read número ${i + 1} com título comprido para estressar o limite de caracteres da mensagem` }));
  for (let i = 0; i < 6; i++) out.push(cluster({ categoria: "relevante", relevancia_empresarial: (i % 4) as 0 | 1 | 2 | 3, titulo: `Relevante número ${i + 1} com título igualmente comprido para o teste de corte progressivo do digest` }));
  for (let i = 0; i < 8; i++) out.push(cluster({ categoria: "no_radar", heat_score: 2, titulo: `No radar item ${i + 1} título longo` }));
  out.push(cluster({ categoria: "sinal_sem_fonte", fonte: null, url: null }));
  return out;
}

describe("renderDigestMessage (Mensagem 1)", () => {
  it("SEMPRE respeita o limite hard de 1500 chars, mesmo com dataset grande", () => {
    const msg = renderDigestMessage(briefing, bigDataset());
    expect(msg.length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
  });

  it("dataset pequeno mantém No radar e TL;DRs completos", () => {
    const msg = renderDigestMessage(briefing, [
      cluster({ categoria: "must_read", heat_score: 7 }),
      cluster({ categoria: "no_radar" }),
    ]);
    expect(msg).toContain("🔥 *Must-read*");
    expect(msg).toContain("📎 *No radar*");
    expect(msg).toContain("💡");
    expect(msg.length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
  });

  it("sem markdown proibido (headers, listas com hífen no início)", () => {
    const msg = renderDigestMessage(briefing, bigDataset());
    expect(msg).not.toMatch(/^#/m);
    expect(msg).not.toMatch(/^- /m);
    expect(msg).not.toMatch(/\|.*\|/);
  });

  it("Atualização mostra 🔁 com o que mudou", () => {
    const msg = renderDigestMessage(briefing, [
      cluster({
        categoria: "must_read",
        is_update: true,
        update_resumo: "Preço caiu 50% desde o anúncio original.",
      }),
    ]);
    expect(msg).toContain("🔁");
    expect(msg).toContain("Preço caiu 50%");
  });

  it("marca curator's pick (✨) e fallback (🟡)", () => {
    const msg = renderDigestMessage(briefing, [
      cluster({ categoria: "must_read", is_curator_pick: true }),
      cluster({ categoria: "relevante", is_fallback: true, fonte: "NeoFeed", url: "https://neofeed.com.br/x" }),
    ]);
    expect(msg).toContain("✨");
    expect(msg).toContain("🟡 NeoFeed");
  });

  it("sinal sem fonte vira linha ⚠️ sem link", () => {
    const msg = renderDigestMessage(briefing, [
      cluster({ categoria: "sinal_sem_fonte", fonte: null, url: null }),
    ]);
    expect(msg).toContain("⚠️ Sinal:");
    expect(msg).not.toContain("📖");
  });

  it("silêncio honesto quando não há must-read nem relevante", () => {
    const msg = renderDigestMessage({ ...briefing, n_suppressed: 0 }, []);
    expect(msg).toContain("Sem cobertura relevante");
  });
});

describe("renderPostsMessage (Mensagem 2)", () => {
  function post(over: Partial<DeliveryPost>): DeliveryPost {
    return {
      titulo: "Cluster do post com título longo o bastante para testar cortes",
      formato: "Carrossel",
      gancho: "Um gancho de até quinze palavras que provoca o empresário a repensar o uso de IA",
      estrutura: Array.from({ length: 8 }, (_, i) => ({ slide: i + 1, texto: `Bloco número ${i + 1} da estrutura` })),
      angulo_tipo: "traducao_empresario",
      angulo_descricao: "o que isso significa para quem decide numa empresa que usa essa tecnologia",
      cta: "Salva esse post.",
      skip: false,
      skip_motivo: null,
      ...over,
    };
  }

  it("SEMPRE ≤ 1500 mesmo com 3 posts cheios + muitos skips", () => {
    const posts = [
      post({}),
      post({ formato: "Reels" }),
      post({ formato: "Post longo" }),
      ...Array.from({ length: 6 }, (_, i) =>
        post({ skip: true, skip_motivo: `motivo de skip número ${i + 1} razoavelmente longo` }),
      ),
    ];
    const msg = renderPostsMessage(posts);
    expect(msg.length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
    expect(msg).toContain("📱 *Posts sugeridos*");
    expect(msg).toContain("🎯 Ângulo:");
  });

  it("nenhum post publicável → mensagem de silêncio honesto", () => {
    const msg = renderPostsMessage([post({ skip: true, skip_motivo: "sem ângulo" })]);
    expect(msg).toContain("Nenhum cluster passou o filtro empresarial hoje");
    expect(msg.length).toBeLessThanOrEqual(WHATSAPP_HARD_LIMIT);
  });
});
