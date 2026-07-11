# @briefing/curation (stub — Fases 1 e 2)

Aqui viverá o motor de curadoria portado de `SKILL.md` (raiz do repo), parametrizado
por account: coleta via `SourceConnector`s, clusterização, Heat Score, seleção de
fonte canônica, notas dimensionais 💻/💼, sugestão de posts, memória/dedupe (pgvector)
e relatório de execução.

Princípios não-negociáveis a preservar (ver `SKILL.md` e `docs/ARCHITECTURE.md`):

- Universo fechado por usuário (nunca citar fonte fora da lista do account)
- Tier 1 canônico / Tier 2-3 sinal (Tier 3 nunca vira link recomendado)
- Skip por padrão em posts (filtro 💼 ≥ 2)
- Silêncio honesto (não inflar o digest)
- PT-BR na entrega; ≤ 1500 chars por mensagem WhatsApp; URLs limpas

Na Fase 0 este pacote é intencionalmente vazio — existe só para reservar o lugar
no workspace e documentar o destino do motor.
