# Pontuação — Heat Score + Notas Dimensionais

## Heat Score (convergência)

Para cada cluster:

- **+2 pontos** por cada portal **Tier 1** que cobre o assunto
- **+1 ponto** por cada portal **Tier 2** que cobre o assunto
- **+1 bônus** se o assunto aparece em **3+ portais brasileiros** (relevância local elevada)
- **+1 bônus** se aparece em **Hacker News com 200+ pontos** (sinal forte da comunidade dev/founder)

### Classificação por Heat

| Faixa | Categoria | Tratamento |
|---|---|---|
| ≥ 6 | 🔥 Must-read | Leitura obrigatória, destaque no topo |
| 3-5 | 📌 Relevante | Leitura sugerida |
| 2 | 📎 No radar | Apenas registrar título |
| < 2 | — | Descartar do digest (mas salvar no Supabase pra análise de tendências) |

> Thresholds afrouxados em relação à versão antiga (7/4-6/2-3) pra abrir mais espaço de leitura. Combina com fallback Tier 2 também em Relevante e com Curator's Pick (ver `SKILL.md` Etapa 4).

## Notas Dimensionais (independentes do Heat)

Para todos os clusters que entram no digest (Must-read, Relevante, No radar, Sinal sem fonte), atribua duas notas em escala 0-3.

**As notas são independentes entre si** — um cluster pode ter alta Técnica e baixa Empresarial (nova versão de framework), ou o oposto (novo imposto sobre serviços de tech).

### 💻 Relevância Técnica (0-3)

Quanto o assunto interessa a programadores e profissionais técnicos?

| Nota | Marcador | Critério |
|---|---|---|
| 0/3 | `—` | Sem conteúdo técnico. Notícia puramente comercial, IPO, M&A, fofoca de mercado |
| 1/3 | `💻` | Toca tangencialmente o universo técnico. Contexto de carreira ou mudança de mercado para devs, sem detalhe técnico utilizável |
| 2/3 | `💻💻` | Conteúdo técnico apreciável. Nova arquitetura, framework, modelo, vulnerabilidade, pesquisa com aplicação prática, mudança em ferramenta amplamente usada |
| 3/3 | `💻💻💻` | Alto impacto técnico. Mudança de paradigma, novo modelo de IA fundamental, vulnerabilidade crítica de larga escala, novo padrão de infraestrutura, descontinuação de tecnologia central |

### 💼 Relevância Empresarial (0-3)

Quanto o assunto afeta direta ou indiretamente quem toma decisões em uma empresa, **independentemente do setor**?

| Nota | Marcador | Critério |
|---|---|---|
| 0/3 | `—` | Curiosidade ou notícia muito específica sem implicação para decisão empresarial |
| 1/3 | `💼` | Contexto de mercado que afeta setores específicos. Pode interessar dependendo do negócio |
| 2/3 | `💼💼` | Impacto direto em categorias amplas de negócio: regulação setorial, mudança em ferramenta usada por muitas empresas, alteração de custos de tecnologia, abertura/fechamento de oportunidade |
| 3/3 | `💼💼💼` | Impacto sistêmico em qualquer empresário: regulação ampla (LGPD, IA Act, tributária), crise econômica, mudança em infra crítica (cloud, pagamentos, identidade digital), mercado de trabalho, IA generativa que muda operações de qualquer setor |

## Exemplos de Calibração

| Notícia | 💻 | 💼 |
|---|---|---|
| Anthropic lança novo modelo Claude com janela de contexto maior | 3/3 | 2/3 |
| Banco Central anuncia nova fase do Drex | 1/3 | 3/3 |
| Vulnerabilidade crítica em OpenSSL | 3/3 | 3/3 |
| Apple anuncia novo iPhone | 1/3 | 1/3 |
| Reforma tributária aprova alíquota especial para SaaS | 1/3 | 3/3 |
| Nova versão do React com server components estáveis | 3/3 | 1/3 |
| Nubank dispara em bolsa após resultado | 0/3 | 2/3 |

## Regras de Ortogonalidade

- Heat **alto** + Técnica **baixa** = todo mundo cobrindo um IPO. Vai pro digest, mas dificilmente pra post (a menos que Empresarial seja alta).
- Heat **baixo** + Técnica **alta** = assunto profundo coberto por poucos portais especializados. Entra no digest com a nota verdadeira; não infle Heat artificialmente.
- Heat **alto** + Empresarial **alta** = candidato número 1 a post.
- Heat **alto** + Empresarial **baixa** = digest sim, post não.

Veja também `references/posts.md` para como Empresarial determina decisão de post.
