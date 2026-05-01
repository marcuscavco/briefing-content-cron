---
name: briefing-empresarial
description: Gera briefing diário de notícias de tecnologia/IA filtradas por relevância pra empresários brasileiros, e cria 3 sugestões de post pra redes sociais. Distribui via email (Gmail connector), salva PDF e HTML no Drive (Drive connector), e manda versão condensada no WhatsApp (Z-API via HTTP). Use sempre que o usuário pedir "briefing", "morning brief", "resumo do dia", "rotina matinal", ou quando uma routine agendada disparar essa skill.
---

# Briefing Empresarial Matinal

> Stack: Web Search/Fetch (nativos) + Gmail connector + Google Drive connector + Z-API (HTTP via web fetch) + WeasyPrint para PDF.

## Configuração — destinos e credenciais

**Os valores sensíveis (Z-API instance/token, email destino, WhatsApp destino) chegam pelo prompt da Remote Routine que invoca essa skill.** Não há credenciais hardcoded neste repo.

Espere encontrar no prompt da routine algo como:

```
EMAIL_DESTINO    = marcus@tavcoholding.com
WHATSAPP_DESTINO = 558599XXXXXXX
ZAPI_INSTANCE    = ...
ZAPI_TOKEN       = ...
ZAPI_ENDPOINT    = https://api.z-api.io/instances/{instance}/token/{token}/send-text
DRIVE_PARENT     = "Briefings"
```

Quando rodando via Remote Routine, esses valores vêm do prompt OU de env vars (`$ZAPI_INSTANCE_ID`, `$ZAPI_TOKEN`, etc.). Se for testar localmente, exporte como env vars antes de rodar.

## Objetivo

Entregar, todo dia às 7h, um briefing acionável de tecnologia/IA pro empresário brasileiro:
1. **3-5 notícias curadas** das últimas 72h, com nota e justificativa
2. **3 opções de post** pra redes sociais baseadas nessas notícias
3. **Distribuição multicanal**: email (com PDF), Drive (PDF + HTML), WhatsApp (resumo)

## Janela Temporal

- Apenas notícias com data de publicação **≤ 72 horas** da execução
- Em caso de dúvida sobre data, descartar
- Nunca incluir notícia "evergreen" sem evento concreto recente

## Fluxo de Execução

### Etapa 0 — Setup do diretório de trabalho

```bash
DATA=$(TZ=America/Sao_Paulo date +%Y-%m-%d)
WORKDIR="/tmp/briefing-${DATA}"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
```

Use `$WORKDIR` para todos os arquivos intermediários (HTML, PDF, JSON).

### Etapa 1 — Pesquisa de notícias (5-8 buscas)

Execute `WebSearch` em cada categoria abaixo, **uma busca por categoria**:

1. `AI announcement launch` (filtro mental: últimas 72h)
2. `Anthropic OR OpenAI OR Google DeepMind OR Meta AI announcement`
3. `notícias tecnologia Brasil` (últimas 72h)
4. `SaaS B2B funding launch product`
5. `regulação IA Brasil OR LGPD inteligência artificial`
6. `produtividade IA empresas ferramentas`
7. `automação processos negócios IA`

Para cada resultado promissor, use **WebFetch** para ler o artigo inteiro antes de pontuar. Não pontue baseado só em snippet. Veja `references/fontes.md` para hierarquia de fontes preferidas.

### Etapa 2 — Curadoria e Pontuação

Avalie cada notícia segundo a rubrica em `references/criterios.md` (resumo):

| Critério | Peso |
|---|---|
| Impacto prático | 30% |
| Relevância pro mercado BR | 25% |
| Novidade real | 20% |
| Acionabilidade | 15% |
| Diferenciação | 10% |

**Filtro final**: nota ≥ 7,0 média ponderada. Pegar 3-5. Se < 3 baterem 7, baixar pra 6,5 e avisar no relatório.

Para cada notícia selecionada, monte:

```json
{
  "id": 1,
  "titulo": "string",
  "fonte": "Nome do veículo",
  "url": "https://...",
  "data": "AAAA-MM-DD",
  "nota": 8.5,
  "resumo": "2-3 frases secas, sem hype, em PT-BR",
  "por_que_importa": "1 frase específica pro empresário brasileiro: 'isso significa que você...'"
}
```

### Etapa 3 — Geração dos 3 Posts

Veja `references/voz.md` para detalhes da voz (peer-to-peer, opinionado, sem hype, sem vender, PT-BR informal direto).

Para cada um dos 3 posts:

```json
{
  "id": 1,
  "noticia_base": 1,
  "formato": "Reels | Carrossel | Estático | Stories",
  "justificativa_formato": "1 frase",
  "gancho": "Primeira frase/frame",
  "estrutura": ["Frame 1: ...", "Frame 2: ..."],
  "cta": "string ou null",
  "hashtags": ["#empreendedorismo", "#ia"],
  "nota_viralizacao": 7.5,
  "justificativa_nota": "por que tem chance de viralizar"
}
```

Diretrizes por formato:
- **Reels**: 15-30s, gancho em 2s, 1 ideia
- **Carrossel**: 6-10 slides, slide 1 = gancho, último = provocação/CTA
- **Estático**: 1 frase punchy, ≤ 2 linhas
- **Stories**: bastidor/quick take, mais informal

### Etapa 4 — Geração do HTML

Salve o JSON consolidado como `$WORKDIR/briefing-${DATA}.json` e gere o HTML carregando `assets/template.html` (do repo da skill) e substituindo placeholders:

- `{{DATA}}` → data por extenso PT-BR (ex: "Sexta, 1 de Maio de 2026")
- `{{NOTICIAS}}` → blocos `<div class="news-item">…</div>` para cada notícia
- `{{POSTS}}` → blocos `<div class="post-item">…</div>` para cada post
- `{{TIMESTAMP}}` → ISO timestamp da geração

Salve como `$WORKDIR/briefing-${DATA}.html`.

### Etapa 5 — Conversão HTML → PDF

```bash
python3 scripts/html_to_pdf.py "$WORKDIR/briefing-${DATA}.html" "$WORKDIR/briefing-${DATA}.pdf"
```

(Esses scripts ficam no diretório raiz do repo clonado pela routine.)

### Etapa 6 — Distribuição (em paralelo)

#### 6.1 Upload pro Google Drive (Gmail/Drive connector)

Use a tool do Google Drive connector para:

1. Localizar/criar pasta-mãe `Briefings` no Meu Drive
2. Localizar/criar subpasta `Briefings/${DATA}/`
3. Upload de:
   - `briefing-${DATA}.pdf`
   - `briefing-${DATA}.html`
4. Capturar URL da pasta para incluir no email/WhatsApp

Se o connector tiver tools como `create_file` ou `upload_file`, use direto. Se não, faça upload via API do Drive autenticada pelo connector.

#### 6.2 Email (Gmail connector)

Use a tool do Gmail connector (típico: `create_draft` + `send`, ou `send_email` se existir):

```
to: {EMAIL_DESTINO}
subject: 🌅 Briefing — {DATA por extenso, ex: 'Sexta, 1 de Maio'}
body_html: assets/email_template.html com placeholders preenchidos
attachments: [briefing-${DATA}.pdf]
```

Se a tool não suportar attachments, mande email sem anexo e referencie o link do Drive no corpo.

#### 6.3 WhatsApp (Z-API via WebFetch ou Bash curl)

Monte a mensagem condensada (máx ~1500 chars):

```
🌅 *Briefing — {DATA}*

📰 *TOP {N} NOTÍCIAS*
1. [{Título}] — Nota {X.X}
   {Resumo de 1 frase}
   👉 {Por que importa}
   🔗 {URL}

2. ...

✍️ *3 IDEIAS DE POST*
1. [{Formato}] {Gancho} (Viral: {X}/10)
2. ...

📄 PDF e HTML completos no Drive: {link da pasta}
```

Envie via:

```bash
python3 scripts/send_zapi.py "{WHATSAPP_DESTINO}" "$(cat $WORKDIR/whatsapp-message.txt)"
```

Ou diretamente via `curl` (substitua `{ZAPI_INSTANCE}`, `{ZAPI_TOKEN}`, `{WHATSAPP_DESTINO}` pelos valores que vierem no prompt):

```bash
curl -X POST "https://api.z-api.io/instances/{ZAPI_INSTANCE}/token/{ZAPI_TOKEN}/send-text" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"{WHATSAPP_DESTINO}\",\"message\":\"...\"}"
```

### Etapa 7 — Relatório final

Retorne um resumo:
- Quantas notícias selecionadas
- Quantos posts gerados
- Status de cada canal (✅ ou ❌ + erro)
- Links: pasta no Drive, email enviado, WhatsApp enviado

## Tratamento de Erros

- **Sem notícias relevantes (todas < 6,5)**: enviar mensagem informando "dia fraco em notícias relevantes" listando o que apareceu
- **Falha em uma das etapas de distribuição**: continuar com as outras, reportar erro no final
- **Falha total na pesquisa**: enviar email/WhatsApp de erro avisando

## Estrutura Drive

```
Meu Drive/
└── Briefings/
    └── AAAA-MM-DD/
        ├── briefing-AAAA-MM-DD.pdf
        └── briefing-AAAA-MM-DD.html
```

## Restrições importantes

- Nunca inventar fontes ou URLs
- Sempre citar fonte original (não citar agregadores tipo Reddit/HackerNews como fonte primária)
- Nunca incluir notícia sem confirmar a data via WebFetch
- Posts devem ser textos prontos pra copiar-colar (não placeholders)
- Use sempre PT-BR. Nada de inglês na entrega final.
