/**
 * Taxonomia fechada de temas (decisão de produto: nada de campo aberto).
 * Selecionar a categoria inteira = todas as subcategorias; dá para refinar
 * marcando só algumas (ex.: todo o Jurídico, ou só Direito Tributário).
 * Os labels selecionados vão para briefing_profiles.themes (text[]) e são o
 * que o motor de curadoria usa nos prompts.
 */
export type ThemeCategory = { id: string; label: string; subs: string[] };

export const THEME_TAXONOMY: ThemeCategory[] = [
  {
    id: "tecnologia",
    label: "Tecnologia",
    subs: [
      "Inteligência Artificial",
      "SaaS & Cloud",
      "Startups & Venture Capital",
      "Big Techs & Plataformas",
      "Cibersegurança",
      "Hardware & Chips",
      "Desenvolvimento de Software",
    ],
  },
  {
    id: "negocios",
    label: "Negócios & Gestão",
    subs: [
      "Empreendedorismo",
      "Gestão & Liderança",
      "M&A e Investimentos",
      "Pequenas & Médias Empresas",
      "Franquias",
      "RH & Futuro do Trabalho",
    ],
  },
  {
    id: "economia",
    label: "Economia & Mercado",
    subs: [
      "Macroeconomia",
      "Mercado Financeiro",
      "Fintechs & Pagamentos",
      "Criptomoedas & Web3",
      "Comércio Exterior",
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Mídia",
    subs: [
      "Marketing Digital",
      "Redes Sociais & Creators",
      "Publicidade",
      "E-commerce & Varejo",
      "Branding",
    ],
  },
  {
    id: "juridico",
    label: "Jurídico",
    subs: [
      "Direito Tributário",
      "Direito Trabalhista",
      "Direito Empresarial",
      "Direito do Consumidor",
      "Regulação & LGPD",
    ],
  },
  {
    id: "politica",
    label: "Política & Regulação",
    subs: ["Política Brasil", "Regulação de Tecnologia", "Internacional & Geopolítica"],
  },
  {
    id: "ciencia",
    label: "Ciência & Saúde",
    subs: ["Saúde & Healthtechs", "Ciência & Pesquisa", "Energia & Clima", "Agronegócio"],
  },
];
