/** Shapes mínimos que a entrega precisa (subset das rows persistidas). */

export interface DeliveryBriefing {
  id: string;
  run_date: string;
  n_must_read: number;
  n_relevante: number;
  n_no_radar: number;
  n_suppressed: number;
  n_updates: number;
}

/** Notícia individual dentro de um assunto (clusters.itens jsonb). */
export interface DeliveryClusterItem {
  title: string;
  url: string;
  portal: string;
  publishedAt?: string | null;
  tier?: number; // ausente em rows antigas; Tier 3 nunca vira link
}

export interface DeliveryCluster {
  titulo: string;
  resumo: string | null;
  categoria: string; // must_read | relevante | no_radar | sinal_sem_fonte
  heat_score: number;
  relevancia_tecnica: number | null;
  relevancia_empresarial: number | null;
  fonte: string | null;
  url: string | null;
  is_fallback: boolean;
  is_curator_pick: boolean;
  is_update: boolean;
  update_resumo: string | null;
  // campos novos — opcionais para retrocompat com briefings antigos
  em_alta?: boolean;
  heat_boost?: number;
  itens?: DeliveryClusterItem[] | null;
}

export interface DeliveryPost {
  titulo?: string | null; // titulo do cluster relacionado (join)
  formato: string | null;
  gancho: string | null;
  estrutura: { slide: number; texto: string }[] | null;
  angulo_tipo: string | null;
  angulo_descricao: string | null;
  cta: string | null;
  skip: boolean;
  skip_motivo: string | null;
}

export interface WhatsappSender {
  /** Envia texto para o valor LITERAL do destino (match exato — sem normalizar). */
  sendText(phone: string, message: string): Promise<{ ok: boolean; response: unknown }>;
}

export interface EmailSender {
  send(to: string, subject: string, html: string): Promise<{ ok: boolean; response: unknown }>;
}
