# Granularidade de cluster — antes/depois (Fase D)

> **ANTES** = prompt v1 ("um cluster = um assunto", que o Gemini interpretava como TEMA).
> **DEPOIS** = prompt v2 ("um cluster = UM FATO específico; guarda-chuva proibido; cluster de 1 item é normal").
> Mesmos 4 dias reais de coleta, mesmo modelo de produção (Gemini 3 Flash). Sonnet 5 incluído como referência de contagem.

**Como validar:** os títulos do DEPOIS devem nomear fatos ("Quem faz o quê"); se algum título ainda parecer categoria/tema, reprove.

---

## Resumo quantitativo

| Dia | Gemini ANTES (clusters · digest · média itens) | Gemini DEPOIS | Sonnet DEPOIS (ref.) | Custo Gemini DEPOIS |
|---|---|---|---|---|
| marketing-2026-07-12 | 11 · 7 · 1.5 | **13 · 5 · 1.1** | 17 · 7 · 1.0 | $0.0219 · 24s |
| negocios-2026-07-11 | 6 · 6 · 3.2 | **15 · 4 · 1.1** | 20 · 3 · 1.1 | $0.0203 · 23s |
| tech-2026-07-10 | 10 · 8 · 3.6 | **15 · 6 · 1.9** | 39 · 15 · 1.4 | $0.0269 · 27s |
| tech-2026-07-12 | 10 · 5 · 2.4 | **15 · 8 · 1.4** | 37 · 12 · 1.2 | $0.0244 · 25s |

_Leitura esperada: DEPOIS com muito mais clusters (granularidade de fato), média de itens/cluster menor e digest honesto (só o que convergiu)._

---

## Dia: marketing-2026-07-12

### ANTES (prompt v1) — 11 clusters

- **[relevante]** Varejo alimentar sob pressão: inflação e o impacto das redes no consumo _(heat 3 · 2 items)_
- **[no_radar]** A escalada global do hardware para IA: SK Hynix, Nokia e rivais europeus _(heat 2 · 3 items)_
- **[no_radar]** Empreendedorismo em seguros: insurtechs brasileiras em expansão acelerada _(heat 2 · 2 items)_
- **[no_radar]** O avanço da memória persistente em IAs e os desafios de privacidade _(heat 2 · 1 item)_
- **[no_radar]** Brasil se torna epicentro financeiro do surfe mundial via WSL _(heat 2 · 1 item)_
- **[no_radar]** Energia renovável atinge competitividade recorde frente a fósseis _(heat 2 · 1 item)_
- **[no_radar]** Regulação de criptoativos: CVM monitora contratos perpétuos e derivativos _(heat 2 · 1 item)_
- _[descartado]_ Apple processa OpenAI por roubo de segredos comerciais _(heat 1 · 1 item)_
- _[descartado]_ Pequenos negócios lucram como pontos de retirada para e-commerce _(heat 1 · 1 item)_
- _[descartado]_ Nubank obtém licença bancária no México e projeta investimento de US$ 4,2 bi _(heat 1 · 1 item)_
- _[descartado]_ Redes sociais reforçam detecção de conteúdo e spam gerado por IA _(heat 1 · 2 items)_

### DEPOIS (prompt v2) — 13 clusters

- **[no_radar]** Irã anuncia fechamento do Estreito de Ormuz e eleva tensão global _(heat 2 · 2 items)_
- **[no_radar]** CEO do Grupo Carrefour Brasil detalha desafios do consumo no varejo alimentar _(heat 2 · 1 item)_
- **[no_radar]** Insurtech brasileira de viagens capta R$ 35 milhões para expansão internacional _(heat 2 · 1 item)_
- **[no_radar]** Geração Z impulsiona lucro de marcas através da nostalgia no marketing digital _(heat 2 · 1 item)_
- **[no_radar]** Split Risk alcança faturamento de R$ 60 milhões com seguros de nicho _(heat 2 · 1 item)_
- _[descartado]_ Nubank obtém licença bancária no México e planeja aporte de US$ 4,2 bilhões _(heat 1 · 1 item)_
- _[descartado]_ Pequenos negócios diversificam receita atuando como pontos de retirada logísticos _(heat 1 · 1 item)_
- _[descartado]_ Rússia suspende exportação de diesel e impacta fornecimento no Brasil _(heat 1 · 1 item)_
- _[descartado]_ Nokia pivota estratégia para fornecer infraestrutura de data centers de IA _(heat 1 · 1 item)_
- _[descartado]_ Apple processa OpenAI por suposto roubo de segredos industriais _(heat 1 · 1 item)_
- _[descartado]_ Cantaloup inicia expansão internacional com inauguração em Lisboa _(heat 1 · 1 item)_
- _[descartado]_ Credores minoritários da Braskem acionam CVM por assento em reestruturação _(heat 1 · 1 item)_
- _[descartado]_ TikTok testa novo sistema para identificar spam gerado por inteligência artificial _(heat 1 · 1 item)_

---

## Dia: negocios-2026-07-11

### ANTES (prompt v1) — 6 clusters

- **[relevante]** SK Hynix e Nokia: O gargalo e a oportunidade na infraestrutura de IA _(heat 5 · 4 items)_
- **[relevante]** Estratégia e Governança: Foco no cliente e reestruturações societárias _(heat 4 · 3 items)_
- **[no_radar]** OpenAI lança ChatGPT Work sob processos judiciais da Apple e jornais _(heat 2 · 4 items)_
- **[no_radar]** M&A e Expansão: Nubank no México, venda da Oi e aquisição da EasyJet _(heat 2 · 3 items)_
- **[no_radar]** Crise no diesel russo e disputas tributárias no setor de energia _(heat 2 · 4 items)_
- **[no_radar]** Segurança e Tecnologia: IA em Blockchain e auditoria de contratos _(heat 2 · 1 item)_

### DEPOIS (prompt v2) — 15 clusters

- **[no_radar]** Apple processa OpenAI por roubo de segredos industriais _(heat 2 · 2 items)_
- **[no_radar]** SK Hynix alerta para crise crítica de oferta de memória em 2027 _(heat 2 · 1 item)_
- **[no_radar]** Priorização do atendimento ao cliente é essencial para sucesso de CEOs _(heat 2 · 1 item)_
- **[no_radar]** IA se consolida na auditoria de contratos inteligentes de blockchain _(heat 2 · 1 item)_
- _[descartado]_ EasyJet aceita oferta de aquisição de US$ 7,6 bilhões da Apollo _(heat 1 · 1 item)_
- _[descartado]_ Nubank recebe licença bancária no México e prevê investimento bilionário _(heat 1 · 1 item)_
- _[descartado]_ OpenAI lança ChatGPT Work focado em produtividade corporativa _(heat 1 · 1 item)_
- _[descartado]_ SK Hynix estreia na Nasdaq com maior oferta estrangeira nos EUA _(heat 1 · 1 item)_
- _[descartado]_ Porto Serviço busca captar R$ 4,5 bilhões após receita recorde _(heat 1 · 1 item)_
- _[descartado]_ Oi assina venda de unidade de serviços por R$ 60,1 milhões _(heat 1 · 1 item)_
- _[descartado]_ SLC Agrícola reduz escopo de compra de terras da Radar _(heat 1 · 1 item)_
- _[descartado]_ Credores minoritários da Braskem tentam participar de reestruturação _(heat 1 · 1 item)_
- _[descartado]_ Cantaloup inicia expansão internacional com restaurante em Lisboa _(heat 1 · 1 item)_
- _[descartado]_ Brasil tem janela de 3 anos para ser competitivo em data centers _(heat 1 · 1 item)_
- _[descartado]_ Setor de biodiesel pressiona governo por aceleração do B25 _(heat 1 · 1 item)_

---

## Dia: tech-2026-07-10

### ANTES (prompt v1) — 10 clusters

- **[relevante]** OpenAI lança família GPT-5.6, ChatGPT Work e modelo de voz GPT-Live _(heat 5 · 10 items)_
- **[relevante]** Meta usará fotos públicas do Instagram para treinar IA de imagem _(heat 4 · 3 items)_
- **[relevante]** Meta lança agente Muse Spark 1.1 e anuncia fabricação de chips próprios _(heat 3 · 3 items)_
- **[relevante]** Apple investe US$ 30 bi em chips nos EUA e enfrenta reveses na UE _(heat 3 · 4 items)_
- **[relevante]** Venda de PCs recua e crise de memórias impacta eletrônicos básicos _(heat 3 · 3 items)_
- **[no_radar]** Anthropic lança Claude Fable 5 sob alertas de segurança da China _(heat 2 · 4 items)_
- **[no_radar]** Fim do uBlock Origin clássico no Chrome e foco em privacidade no YouTube _(heat 2 · 2 items)_
- **[no_radar]** New York Times acusa OpenAI de ocultar evidências em processo de IA _(heat 2 · 2 items)_
- _[descartado]_ Expansão de datacenters de IA eleva emissões de carbono da Microsoft _(heat 1 · 2 items)_
- _[descartado]_ Startups de IA captam rodadas de US$ 100 milhões e buscam valuations recordes _(heat 1 · 3 items)_

### DEPOIS (prompt v2) — 15 clusters

- **[relevante]** OpenAI lança família GPT-5.6 e assistente ChatGPT Work _(heat 3 · 6 items)_
- **[relevante]** Apple fecha acordo de US$ 30 bilhões para produzir chips nos EUA _(heat 3 · 2 items)_
- **[relevante]** Meta lança Muse Spark 1.1 para automação de programação com IA _(heat 3 · 2 items)_
- **[relevante]** OpenAI apresenta GPT-Live para conversas naturais por voz _(heat 3 · 2 items)_
- **[no_radar]** New York Times acusa OpenAI de ocultar evidências em processo de direitos autorais _(heat 2 · 2 items)_
- **[no_radar]** Crise de chips de memória causa queda global de 4,9% nas vendas de PCs _(heat 2 · 2 items)_
- _[descartado]_ Apple perde recurso contra lei da União Europeia que limita Big Techs _(heat 1 · 2 items)_
- _[descartado]_ China alerta para vulnerabilidades de coleta de dados no Claude Code _(heat 1 · 2 items)_
- _[descartado]_ Anthropic lança modelo Fable 5 para competir em performance _(heat 1 · 2 items)_
- _[descartado]_ SK Hynix estreia nos EUA para capturar demanda por chips de IA _(heat 1 · 2 items)_
- _[descartado]_ Startup Lyzr levanta US$ 100 milhões em rodada operada por agente de IA _(heat 1 · 1 item)_
- _[descartado]_ Crise de caixa ameaça continuidade das operações da Oi em agosto _(heat 1 · 1 item)_
- _[descartado]_ OpenAI encerra navegador Atlas para focar em agentes e extensões _(heat 1 · 1 item)_
- _[descartado]_ Device Code Phishing: especialistas alertam para golpe que ignora senhas _(heat 1 · 1 item)_
- _[descartado]_ Microsoft expande infraestrutura e vê emissões de carbono saltarem 25% _(heat 0 · 1 item)_

---

## Dia: tech-2026-07-12

### ANTES (prompt v1) — 10 clusters

- **[relevante]** Meta sofre pressão regulatória na UE e recua em recursos de IA _(heat 5 · 6 items)_
- **[relevante]** Estreia recorde da SK Hynix na Nasdaq impulsiona setor de chips _(heat 4 · 3 items)_
- **[relevante]** OpenAI lança GPT-5.6 e reformula linha de modelos _(heat 3 · 3 items)_
- **[no_radar]** Apple processa OpenAI por roubo de segredos industriais _(heat 2 · 2 items)_
- **[no_radar]** IA dobra incidência de vulnerabilidades críticas em empresas _(heat 2 · 2 items)_
- _[descartado]_ Mercado de IA migra para modelos Open Source para evitar dependência _(heat 1 · 1 item)_
- _[descartado]_ Google expande ecossistema Gemini com novas ferramentas de IA _(heat 1 · 3 items)_
- _[descartado]_ Oratomic capta US$ 300 milhões para computação quântica viável _(heat 1 · 1 item)_
- _[descartado]_ Vazamentos indicam avanços em hardware da Apple e NVIDIA _(heat 1 · 2 items)_
- _[descartado]_ Transição para TV 3.0 no Brasil movimenta fabricantes _(heat 1 · 1 item)_

### DEPOIS (prompt v2) — 15 clusters

- **[relevante]** SK Hynix capta US$ 26,5 bilhões em estreia recorde na Nasdaq _(heat 4 · 3 items)_
- **[relevante]** União Europeia acusa Meta de causar dependência com design viciante _(heat 3 · 2 items)_
- **[relevante]** Meta cancela ferramenta de IA no Instagram após reação negativa _(heat 3 · 2 items)_
- **[no_radar]** Apple processa OpenAI por roubo de segredos comerciais _(heat 2 · 2 items)_
- **[no_radar]** OpenAI descontinua navegador Atlas e integra recursos ao app Work _(heat 2 · 1 item)_
- **[no_radar]** Anthropic lança painel de controle e produtividade para o Claude _(heat 2 · 1 item)_
- **[no_radar]** Ferramenta da Meta falha em detectar imagens geradas por sua própria IA _(heat 2 · 2 items)_
- **[no_radar]** Amazon lança Alexa+ com IA generativa para membros Prime _(heat 2 · 1 item)_
- _[descartado]_ CISA admite falha operacional durante resposta a incidente de segurança _(heat 1 · 1 item)_
- _[descartado]_ Hugging Face aponta explosão do uso de IA Open Source em empresas _(heat 1 · 1 item)_
- _[descartado]_ Oratomic levanta US$ 300 milhões para computação quântica viável _(heat 1 · 1 item)_
- _[descartado]_ IA eleva vulnerabilidades e força mudança em prioridades de cibersegurança _(heat 1 · 1 item)_
- _[descartado]_ Startup Fizz acusa VC Maveron de vazar segredos para rival Sidechat _(heat 1 · 1 item)_
- _[descartado]_ TikTok testa sistema para barrar contas que usam IA para criar spam _(heat 1 · 1 item)_
- _[descartado]_ OpenAI lança GPT-5.6 com novos modelos Sol, Terra e Luna _(heat 0 · 1 item)_

---
