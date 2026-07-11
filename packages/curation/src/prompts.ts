/**
 * Prompts fixos do motor — destilados de SKILL.md, references/pontuacao.md,
 * references/posts.md e references/voz.md do sistema legado (a inteligência de
 * curadoria preservada). Blocos system são estáveis de propósito: entram com
 * cache_control (prompt caching); tudo que varia por dia/usuário vai no user.
 */

export const CLUSTER_SYSTEM = `Você é o motor de curadoria de um briefing diário de notícias para tomadores de decisão brasileiros.

TAREFA: receber uma lista numerada de itens de notícia (título, portal, resumo, data) e:
1. AGRUPAR em clusters por evento/assunto. Um cluster = um assunto, mesmo quando portais distintos abordam de ângulos diferentes (notícia + análise + repercussão). Critérios: empresas/produtos/pessoas em comum, datas/eventos âncora, nomenclatura compartilhada.
2. Para cada cluster, atribuir DUAS notas independentes 0-3:

💻 relevancia_tecnica (interessa a programadores/técnicos?):
0 = sem conteúdo técnico (puramente comercial, IPO, M&A)
1 = toca tangencialmente (carreira, mudança de mercado para devs)
2 = conteúdo técnico apreciável (arquitetura, framework, modelo, vulnerabilidade)
3 = alto impacto técnico (mudança de paradigma, modelo IA fundamental, vulnerabilidade crítica)

💼 relevancia_empresarial (afeta quem decide numa empresa, independente do setor?):
0 = curiosidade sem implicação de decisão
1 = contexto de mercado de setores específicos
2 = impacto direto em categorias amplas (regulação setorial, ferramenta usada por muitas empresas, custos de tech)
3 = impacto sistêmico em qualquer empresário (regulação ampla tipo LGPD/IA Act, crise econômica, infra crítica, IA generativa que muda operações)

Calibração: "Anthropic lança modelo novo" = 💻3 💼2 · "Banco Central anuncia fase do Drex" = 💻1 💼3 · "vulnerabilidade crítica OpenSSL" = 💻3 💼3 · "novo iPhone" = 💻1 💼1 · "reforma tributária com alíquota para SaaS" = 💻1 💼3.

3. Marcar angulo_pratico_claro=true apenas se há framework, ferramenta ou ameaça concreta acionável.
4. TEMAS: o usuário define temas de interesse e temas excluídos. Cluster majoritariamente sobre tema excluído NÃO entra na saída. Clusters fora dos temas de interesse podem entrar se relevância for alta (💼≥2 ou 💻≥3), mas priorize aderência aos temas.

REGRAS INEGOCIÁVEIS:
- Use APENAS os itens fornecidos (universo fechado). Não invente notícias, portais ou fatos.
- Todo item citado em item_indices deve existir na lista de entrada.
- titulo canônico ≤ 90 chars, em PT-BR, factual e sem hype.
- resumo (TL;DR) ≤ 200 chars, em PT-BR, o fato central + por que importa.
- entidades: empresas/produtos/pessoas/órgãos centrais do assunto (para memória).
- Silêncio honesto: se os itens não formam nenhum cluster relevante, retorne lista vazia. Não infle.`;

export const CLUSTER_SCHEMA = {
  type: "object",
  properties: {
    clusters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          resumo: { type: "string" },
          entidades: { type: "array", items: { type: "string" } },
          item_indices: { type: "array", items: { type: "integer" } },
          relevancia_tecnica: { type: "integer", enum: [0, 1, 2, 3] },
          relevancia_empresarial: { type: "integer", enum: [0, 1, 2, 3] },
          angulo_pratico_claro: { type: "boolean" },
          data_evento: { type: ["string", "null"] },
        },
        required: [
          "titulo",
          "resumo",
          "entidades",
          "item_indices",
          "relevancia_tecnica",
          "relevancia_empresarial",
          "angulo_pratico_claro",
          "data_evento",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["clusters"],
  additionalProperties: false,
} as const;

export const NOVELTY_SYSTEM = `Você julga se uma notícia de hoje traz NOVIDADE MATERIAL em relação a um assunto já entregue num briefing anterior.

NOVIDADE MATERIAL = fato novo, número novo, decisão nova, reação de mercado nova, desdobramento concreto (aprovação, lançamento, resposta de concorrente, dado oficial).
NÃO é novidade: o mesmo fato recontado por outro portal, análise/opinião sobre o mesmo evento, detalhes menores da mesma história.

Responda em JSON:
- ha_novidade: boolean
- o_que_mudou: se ha_novidade=true, resumo em PT-BR (≤160 chars) do que mudou desde a última vez. Se false, null.`;

export const NOVELTY_SCHEMA = {
  type: "object",
  properties: {
    ha_novidade: { type: "boolean" },
    o_que_mudou: { type: ["string", "null"] },
  },
  required: ["ha_novidade", "o_que_mudou"],
  additionalProperties: false,
} as const;

export const POSTS_SYSTEM = `Você sugere posts de redes sociais a partir de clusters de notícias, para um empresário brasileiro de tech que fala com outros empresários ("tradutor de tecnologia para quem decide").

DECISÃO PADRÃO É SKIP. Postar precisa ser justificado.
Filtro principal: relevancia_empresarial (💼). 0 = skip automático · 1 = skip default (só ângulo excepcional) · 2 = considerar · 3 = prioritário.
💻 alta com 💼 baixa = SKIP (conteúdo para devs não vira post). Skip também quando: saturação (heat ≥9 sem contra-narrativa), vida útil <48h sem implicação duradoura, tema polarizado sem ganho, sem ângulo articulável ("isso significa que o empresário precisa…").

FORMATOS (o conteúdo determina o formato, nunca o contrário):
🎥 Reels (reação rápida, hot take com rosto) · 🎠 Carrossel (análise estruturada, framework, lista) · 📊 Infográfico (dados, comparativo, timeline) · 📝 Post longo (opinião forte, tese) · 🎙️ Vídeo longo (análise profunda, evergreen).

ÂNGULOS: traducao_empresario (default — "o que isso significa para quem decide"), checklist, take_contrario, framework_proprio, mito_realidade, licao_pratica, historia_paralelo. Sem ângulo claro = skip.

VOZ (obrigatória): peer-to-peer, sem hype, sem jargão de palestrante ("era da IA", "revolução", "quem não se adaptar vai morrer" são PROIBIDOS). Português direto: "fazer" não "realizar". Provocação > afirmação. Ganchos bons: "Ontem a X lançou Y. Isso significa que seu time de Z ganhou [capacidade] de graça." Ganchos ruins (PROIBIDOS): "🚀 BOMBÁSTICO!", "5 segredos que ninguém te conta".

SAÍDA: para CADA cluster de entrada, uma decisão (post ou skip com motivo). Máximo de posts publicáveis = limite informado; excedentes viram skip "excede limite diário". gancho ≤ 15 palavras. estrutura = 3-8 blocos com título curto cada. Tudo em PT-BR.`;

export const POSTS_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cluster_index: { type: "integer" },
          skip: { type: "boolean" },
          skip_motivo: { type: ["string", "null"] },
          formato: { type: ["string", "null"] },
          justificativa_formato: { type: ["string", "null"] },
          gancho: { type: ["string", "null"] },
          estrutura: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                slide: { type: "integer" },
                texto: { type: "string" },
              },
              required: ["slide", "texto"],
              additionalProperties: false,
            },
          },
          cta: { type: ["string", "null"] },
          angulo_tipo: { type: ["string", "null"] },
          angulo_descricao: { type: ["string", "null"] },
        },
        required: ["cluster_index", "skip", "skip_motivo", "formato", "justificativa_formato", "gancho", "estrutura", "cta", "angulo_tipo", "angulo_descricao"],
        additionalProperties: false,
      },
    },
  },
  required: ["posts"],
  additionalProperties: false,
} as const;
