# briefing-content-cron

Skill `briefing-empresarial` para gerar briefing diário de tecnologia/IA com curadoria, geração de posts, e distribuição via Email + Google Drive + WhatsApp (Z-API).

Roda como Remote Routine do Claude Code, agendada para 7h America/São Paulo (10h UTC).

## Estrutura

```
.
├── SKILL.md                    # ponto de entrada — instruções principais
├── references/
│   ├── voz.md                  # detalhes da voz/tom Marcus
│   ├── fontes.md               # lista de fontes priorizadas
│   └── criterios.md            # rubrica de avaliação detalhada
├── assets/
│   ├── template.html           # template HTML dark/premium do briefing
│   └── email_template.html     # template do email
└── scripts/
    ├── html_to_pdf.py          # converte HTML em PDF (WeasyPrint)
    └── send_zapi.py            # wrapper pro Z-API
```

## Como a routine usa

A Remote Routine clona este repo, lê `SKILL.md` e executa o fluxo (etapas 0–7). Connectors necessários (configurar em [claude.ai/customize/connectors](https://claude.ai/customize/connectors)):

- Gmail
- Google Drive

WhatsApp via Z-API é HTTP puro — sem connector necessário.

## Setup local de teste

```bash
git clone https://github.com/marcuscavco/briefing-content-cron.git
cd briefing-content-cron
# editar credenciais em SKILL.md ou exportar env vars
# rodar pelo Claude Code: "Read SKILL.md and execute the full flow"
```
