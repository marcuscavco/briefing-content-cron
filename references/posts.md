# Sugestão de Posts — Decisão, Formato, Ângulo

## Posicionamento do leitor

Especialista em tecnologia **para empresários**. Os posts traduzem novidades técnicas em implicações para quem decide em uma empresa. Conteúdo puramente técnico (que interessa a devs/profissionais técnicos) **não vira post**, mesmo que tenha alto valor pessoal de leitura — fica apenas no digest.

## Decisão: Postar ou Skip

**A decisão padrão é Skip.** Postar precisa ser justificado.

O filtro principal é **Relevância Empresarial**:

| Empresarial | Tratamento default |
|---|---|
| 0/3 | Skip automático (sem implicação para empresário) |
| 1/3 | Skip default (afeta setores muito específicos) — só posta se houver ângulo excepcional |
| 2/3 | Considerar postar (afeta categorias amplas de negócio) |
| 3/3 | Postar prioritariamente (impacto sistêmico em qualquer empresário) |

**Skip também quando** (mesmo com Empresarial alta):
- Saturação alta — Heat ≥ 9 + tema genérico onde "todo mundo já está postando" e não há contra-narrativa do leitor
- Notícia com vida útil < 48h e sem implicação duradoura
- Tema polarizado sem benefício claro de posicionamento
- Sem ângulo articulável (não dá pra completar a frase "isso significa que o empresário precisa…")

**Importante — Relevância Técnica não é critério de post:**
- Cluster com 💻 3/3 e 💼 0-1/3 → **Skip**, mesmo sendo tecnicamente fascinante. Vai pro digest pessoal, não pra rede social.
- Cluster com 💻 0-1/3 e 💼 3/3 → **Postar** com prioridade alta. É exatamente o tipo de conteúdo que constrói o posicionamento "tradutor para empresários".
- Cluster com 💻 alta E 💼 alta → **Postar**, mas o framing privilegia o ângulo empresarial; profundidade técnica vira nota de rodapé/contexto.

**Limite por digest:** máximo **3 posts publicáveis por dia**. Se mais clusters forem elegíveis, escolhe os 3 com melhor combinação de ângulo único + relevância empresarial. Resto recebe `skip — bom assunto, mas excede limite diário; reservar para depois`.

## Formatos

| Formato | Quando usa | Quando evita |
|---|---|---|
| 🎥 **Reels** (15-60s) | Reação rápida, hot take, opinião forte com rosto na câmera, demonstração visual de produto/conceito, encaixe em trend | Análise densa, dados que precisam de leitura, raciocínio sequencial longo |
| 🎠 **Carrossel** (5-10 slides) | Análise estruturada, framework, lista numerada, comparação antes/depois, "X coisas para saber sobre Y", tutorial visual, breakdown de conceito | Conteúdo que envelhece em horas, tema que precisa de áudio/voz |
| 📊 **Infográfico** (imagem única) | Dados, estatísticas, visualização de processo, comparativo lado a lado, timeline | Tópicos sem dado visualizável, narrativa que precisa de sequência |
| 📝 **Post longo / Thread** | Opinião forte, análise de mercado, história pessoal, raciocínio que constrói argumento por etapas, posicionamento de tese | Conteúdo puramente informativo onde texto não acrescenta nada à imagem |
| 🎙️ **Vídeo longo / Podcast** | Análise profunda, entrevista, tutorial denso, conteúdo evergreen para SEO/autoridade, episódio temático | Notícias quentes, hot takes, reações imediatas |

**Regra de ouro:** o conteúdo determina o formato, não o contrário. Se o assunto é denso e cheio de dados, não force em Reels só porque "Reels engaja mais". Conteúdo errado em formato errado tem performance pior do que conteúdo certo em formato menos viral.

## Ângulos

Para cada post sugerido, articule um **ângulo** explícito — não basta dizer "fale sobre X", tem que ser "fale sobre X **a partir de Y**". Sem ângulo claro, retorna Skip.

### Ângulo padrão (default)

**`traducao_empresario`** — *Tradução para empresário*: "O que isso significa para quem decide em uma empresa que [usa essa tecnologia / opera nesse mercado / depende desse fornecedor]". Esse é o ângulo nativo do posicionamento e a maioria dos posts deve seguir essa lógica.

### Variações aceitáveis

- **`checklist`** — *Checklist acionável*: "5 coisas pra checar no seu negócio depois desta notícia". Bom para regulação, mudanças de fornecedor, vulnerabilidades que afetam empresas
- **`take_contrario`** — *Take contrário*: "Enquanto todo mundo comemora/teme X, eis o que está sendo subestimado para o empresário..." Bom quando há narrativa dominante na imprensa que ignora ângulo de negócio
- **`framework_proprio`** — *Conexão com framework próprio*: "Mais um caso de Give-First Marketing na prática" / "Como esse movimento valida [tese]" Quando há ponte natural com a metodologia GFM
- **`mito_realidade`** — *Mito vs realidade*: "Lendo as manchetes dá uma impressão. Olhando os dados, é outra história para o empresário." Bom para hype tecnológico onde a imprensa exagera ou minimiza
- **`licao_pratica`** — *Lição prática*: "3 coisas que o empresário pode aprender olhando isso acontecer"
- **`historia_paralelo`** — *História/paralelo*: "Já vi acontecer em [empresa/cliente] de jeito parecido. O que aprendi..."

### O que NÃO usar (não combina com posicionamento)

- Hot takes técnicos ("essa arquitetura é genial/ridícula") — isso é conteúdo para devs, não para empresários
- Discussões de implementação ("como integrar X com Y") — fica no digest pessoal
- Drama de mercado sem implicação prática para empresário

## Output do bloco de post (formato Mensagem 2 WhatsApp)

```
1. <Título do cluster ≤ 60 chars>
<emoji formato> <Formato + parâmetros>
🎯 Ângulo: <tipo> — <descrição em ≤ 80 chars>
📣 Hook: "<até 15 palavras>"
🧱 Estrutura: 1.<título> · 2.<título> · 3.<título> · ... · N.<CTA>
```

Skips no fim:

```
⏭️ *Skip hoje:*
• <Título>: <razão ≤ 50 chars>
• <Título>: <razão ≤ 50 chars>
```
