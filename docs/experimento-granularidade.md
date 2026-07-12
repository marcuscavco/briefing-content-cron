# Granularidade de cluster — antes/depois (Fase D)

> **ANTES** = prompt v1 ("um cluster = um assunto" — instável: ora fatos, ora guarda-chuva como o do WhatsApp de 13/07).
> **DEPOIS** = prompt v3 ("um cluster = UMA HISTÓRIA: mesmo ator + mesmo fio narrativo; guarda-chuva multi-ator proibido").
> Mesmos 4 dias reais de coleta, mesmo modelo de produção (Gemini 3 Flash). Sonnet 5 incluído como referência de contagem.

**Como validar:** os títulos do DEPOIS devem nomear fatos ("Quem faz o quê"); se algum título ainda parecer categoria/tema, reprove.

---

## Resumo quantitativo

| Dia | Gemini ANTES (clusters · digest · média itens) | Gemini DEPOIS | Sonnet DEPOIS (ref.) | Custo Gemini DEPOIS |
|---|---|---|---|---|
| marketing-2026-07-12 | 11 · 7 · 1.5 | **18 · 7 · 1.0** | — | $0.0259 · 36s |
| negocios-2026-07-11 | 6 · 6 · 3.2 | **13 · 3 · 1.2** | — | $0.0166 · 20s |
| tech-2026-07-10 | 10 · 8 · 3.6 | **12 · 10 · 3.2** | — | $0.0230 · 24s |
| tech-2026-07-12 | 10 · 5 · 2.4 | **18 · 10 · 1.7** | — | $0.0309 · 37s |

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

### DEPOIS (prompt v3) — 18 clusters

- **[no_radar]** CEO do Carrefour Brasil analisa queda no poder de compra do consumidor _(heat 2 · 1 item)_
- **[no_radar]** Insurtech Split Risk fatura R$ 60 milhões ao diversificar atuação em seguros _(heat 2 · 1 item)_
- **[no_radar]** Insurtech de seguro-viagem levanta R$ 35 milhões para expansão internacional _(heat 2 · 1 item)_
- **[no_radar]** Escritório brasileiro da WSL transforma o país em potência financeira do surfe _(heat 2 · 1 item)_
- **[no_radar]** Empresas de tecnologia apostam em memória persistente para assistentes de IA _(heat 2 · 1 item)_
- **[no_radar]** Geração Z lidera tendência de consumo baseada em nostalgia e sucessos antigos _(heat 2 · 1 item)_
- **[no_radar]** Valentina Caran detalha estratégia de liderança no mercado imobiliário de luxo _(heat 2 · 1 item)_
- _[descartado]_ Nubank obtém licença bancária no México e projeta investimento de US$ 4,2 bilhões _(heat 1 · 1 item)_
- _[descartado]_ Pequenos negócios adotam pontos de retirada como fonte de receita logística _(heat 1 · 1 item)_
- _[descartado]_ Apple processa OpenAI por suposto uso indevido de segredos comerciais _(heat 1 · 1 item)_
- _[descartado]_ SK Hynix estreia na Nasdaq com a maior oferta estrangeira do ano nos EUA _(heat 1 · 1 item)_
- _[descartado]_ Investigação aponta anúncios de abuso infantil no Instagram na Índia _(heat 1 · 1 item)_
- _[descartado]_ Ferramenta de detecção de IA da Meta apresenta falhas após edições em imagens _(heat 1 · 1 item)_
- _[descartado]_ Cantaloup inicia expansão internacional com primeira unidade em Lisboa _(heat 1 · 1 item)_
- _[descartado]_ Nokia se torna fornecedora de infraestrutura para data centers de IA _(heat 1 · 1 item)_
- _[descartado]_ TikTok testa ferramenta de identificação de spam gerado por inteligência artificial _(heat 1 · 1 item)_
- _[descartado]_ Dieter Schwarz investe em projeto para criar rival europeia das big techs americanas _(heat 1 · 1 item)_
- _[descartado]_ Credores minoritários da Braskem articulam entrada em negociação de dívida _(heat 1 · 1 item)_

---

## Dia: negocios-2026-07-11

### ANTES (prompt v1) — 6 clusters

- **[relevante]** SK Hynix e Nokia: O gargalo e a oportunidade na infraestrutura de IA _(heat 5 · 4 items)_
- **[relevante]** Estratégia e Governança: Foco no cliente e reestruturações societárias _(heat 4 · 3 items)_
- **[no_radar]** OpenAI lança ChatGPT Work sob processos judiciais da Apple e jornais _(heat 2 · 4 items)_
- **[no_radar]** M&A e Expansão: Nubank no México, venda da Oi e aquisição da EasyJet _(heat 2 · 3 items)_
- **[no_radar]** Crise no diesel russo e disputas tributárias no setor de energia _(heat 2 · 4 items)_
- **[no_radar]** Segurança e Tecnologia: IA em Blockchain e auditoria de contratos _(heat 2 · 1 item)_

### DEPOIS (prompt v3) — 13 clusters

- **[relevante]** SK Hynix estreia na Nasdaq com oferta bilionária e alerta para escassez _(heat 3 · 2 items)_
- **[no_radar]** Apple processa OpenAI por roubo de segredos industriais e Musk ironiza _(heat 2 · 2 items)_
- **[no_radar]** Opinião: Atendimento ao cliente é prioridade estratégica para o CEO _(heat 2 · 1 item)_
- _[descartado]_ OpenAI lança ChatGPT Work focado em produtividade corporativa _(heat 1 · 1 item)_
- _[descartado]_ EasyJet aceita oferta de US$ 7,6 bilhões da Apollo em reviravolta de M&A _(heat 1 · 1 item)_
- _[descartado]_ Nubank obtém licença bancária no México e projeta investimento bilionário _(heat 1 · 1 item)_
- _[descartado]_ Nokia se reposiciona como fornecedora estratégica para data centers de IA _(heat 1 · 1 item)_
- _[descartado]_ Oi vende unidade de serviços telefônicos por R$ 60,1 milhões para a Método _(heat 1 · 1 item)_
- _[descartado]_ Porto Serviço planeja expansão de R$ 4,5 bilhões após sucesso inicial _(heat 1 · 1 item)_
- _[descartado]_ Restaurante Cantaloup inicia expansão internacional com unidade em Lisboa _(heat 1 · 1 item)_
- _[descartado]_ Credores minoritários da Braskem exigem participar de reestruturação _(heat 1 · 1 item)_
- _[descartado]_ SLC Agrícola revisa transação com Radar e reduz desembolso financeiro _(heat 1 · 1 item)_
- _[descartado]_ Brasil tem janela de três anos para liderar setor de data centers _(heat 1 · 1 item)_

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

### DEPOIS (prompt v3) — 12 clusters

- **[relevante]** OpenAI lança família de modelos GPT-5.6 e o agente autônomo ChatGPT Work _(heat 4 · 7 items)_
- **[relevante]** OpenAI lança modelo de voz GPT-Live e encerra o navegador experimental Atlas _(heat 4 · 3 items)_
- **[relevante]** Meta lança agente de programação Muse Spark 1.1 e integra geração de IA ao Instagram _(heat 4 · 5 items)_
- **[relevante]** Apple investe US$ 30 bi em chips nos EUA e sofre derrota judicial na União Europeia _(heat 3 · 4 items)_
- **[relevante]** Google revela o agente pessoal Gemini Spark e anuncia fim do Google Earth Pro _(heat 3 · 2 items)_
- **[relevante]** Microsoft adota IA para proteção do Windows contra ataques de Device Code Phishing _(heat 3 · 2 items)_
- **[relevante]** Samsung vaza detalhes do Galaxy Z Fold 8 e estuda fim da linha Z Flip após oitava versão _(heat 3 · 3 items)_
- **[no_radar]** Anthropic lança o modelo Fable 5 enquanto a China alerta para falhas no Claude Code _(heat 2 · 4 items)_
- **[no_radar]** Crise global de memórias causa queda nas vendas de PCs e encarece celulares básicos _(heat 2 · 2 items)_
- **[no_radar]** New York Times acusa OpenAI de ocultar provas em processo sobre direitos autorais _(heat 2 · 2 items)_
- _[descartado]_ Startups de IA utilizam agentes próprios para captar rodadas milionárias de investimento _(heat 1 · 3 items)_
- _[descartado]_ Relatório judicial alerta que Oi pode paralisar operações a partir de agosto por falta de caixa _(heat 1 · 1 item)_

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

### DEPOIS (prompt v3) — 18 clusters

- **[relevante]** SK Hynix estreia na Nasdaq com IPO recorde de US$ 26,5 bilhões _(heat 4 · 3 items)_
- **[relevante]** Meta remove IA do Instagram após críticas e admite erro de abordagem _(heat 3 · 3 items)_
- **[relevante]** União Europeia acusa Meta de violar regras com design viciante _(heat 3 · 2 items)_
- **[relevante]** OpenAI lança modelos GPT-5.6 e encerra navegador Atlas _(heat 3 · 3 items)_
- **[relevante]** Disney+ e Netflix consideram planos gratuitos e canais 'sempre ligados' _(heat 3 · 3 items)_
- **[no_radar]** Apple processa OpenAI por suposto roubo de segredos comerciais _(heat 2 · 2 items)_
- **[no_radar]** Samsung Health utilizará dados de saúde para treinamento de modelos de IA _(heat 2 · 1 item)_
- **[no_radar]** Sunrun planeja distribuir servidores de IA em residências de usuários _(heat 2 · 1 item)_
- **[no_radar]** Detectores da Meta falham em identificar imagens geradas por sua própria IA _(heat 2 · 2 items)_
- **[no_radar]** Projeto de lei brasileiro visa garantir preservação e modo offline em jogos _(heat 2 · 1 item)_
- _[descartado]_ Oratomic capta US$ 300 milhões para viabilizar computador quântico _(heat 1 · 1 item)_
- _[descartado]_ CISA admite falha em protocolos de resposta a incidentes cibernéticos _(heat 1 · 1 item)_
- _[descartado]_ Uso de IA dobra volume de vulnerabilidades críticas em empresas _(heat 1 · 1 item)_
- _[descartado]_ Google lança NotebookLM Short Video e nova IA de imagens _(heat 1 · 3 items)_
- _[descartado]_ Startup Phia é acusada de fraude 'cookie stuffing' em vendas online _(heat 1 · 1 item)_
- _[descartado]_ Hugging Face destaca boom de modelos de IA de código aberto em empresas _(heat 1 · 1 item)_
- _[descartado]_ Vazamento revela bateria de alta capacidade para iPhone dobrável _(heat 1 · 1 item)_
- _[descartado]_ Startup Fizz expande processo contra fundo de VC Maveron por espionagem _(heat 1 · 1 item)_

---
