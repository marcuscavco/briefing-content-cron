export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      briefing_profiles: {
        Row: {
          account_id: string
          active: boolean
          channels: Json
          created_at: string
          delivery_time: string
          excluded_themes: string[]
          id: string
          max_posts_per_day: number
          name: string
          onboarded_at: string | null
          themes: string[]
          timezone: string
          updated_at: string
          voice_overrides: Json | null
          window_hours: number
        }
        Insert: {
          account_id: string
          active?: boolean
          channels?: Json
          created_at?: string
          delivery_time?: string
          excluded_themes?: string[]
          id?: string
          max_posts_per_day?: number
          name?: string
          onboarded_at?: string | null
          themes?: string[]
          timezone?: string
          updated_at?: string
          voice_overrides?: Json | null
          window_hours?: number
        }
        Update: {
          account_id?: string
          active?: boolean
          channels?: Json
          created_at?: string
          delivery_time?: string
          excluded_themes?: string[]
          id?: string
          max_posts_per_day?: number
          name?: string
          onboarded_at?: string | null
          themes?: string[]
          timezone?: string
          updated_at?: string
          voice_overrides?: Json | null
          window_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "briefing_profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          account_id: string
          created_at: string
          executed_at: string
          id: string
          n_clusters_total: number
          n_must_read: number
          n_no_radar: number
          n_posts: number
          n_posts_skipped: number
          n_relevante: number
          n_sinal_sem_fonte: number
          n_suppressed: number
          n_updates: number
          notas: Json
          profile_id: string
          run_date: string
          whatsapp_msg_1: string | null
          whatsapp_msg_2: string | null
          whatsapp_msg_3: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          executed_at?: string
          id?: string
          n_clusters_total?: number
          n_must_read?: number
          n_no_radar?: number
          n_posts?: number
          n_posts_skipped?: number
          n_relevante?: number
          n_sinal_sem_fonte?: number
          n_suppressed?: number
          n_updates?: number
          notas?: Json
          profile_id: string
          run_date: string
          whatsapp_msg_1?: string | null
          whatsapp_msg_2?: string | null
          whatsapp_msg_3?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          executed_at?: string
          id?: string
          n_clusters_total?: number
          n_must_read?: number
          n_no_radar?: number
          n_posts?: number
          n_posts_skipped?: number
          n_relevante?: number
          n_sinal_sem_fonte?: number
          n_suppressed?: number
          n_updates?: number
          notas?: Json
          profile_id?: string
          run_date?: string
          whatsapp_msg_1?: string | null
          whatsapp_msg_2?: string | null
          whatsapp_msg_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "briefing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          account_id: string
          briefing_id: string
          categoria: Database["public"]["Enums"]["cluster_category"]
          created_at: string
          curator_pick_motivo: string | null
          data_publicacao: string | null
          em_alta: boolean
          fonte: string | null
          fts: unknown
          heat_boost: number
          heat_score: number
          id: string
          is_curator_pick: boolean
          is_fallback: boolean
          is_update: boolean
          itens: Json
          ordem: number
          portais_cobrindo: Json
          previous_briefing_id: string | null
          impacto_geral: number | null
          relevancia_empresarial: number | null
          relevancia_tecnica: number | null
          relevancia_tema: number | null
          resumo: string | null
          tier_fonte: number | null
          titulo: string
          topic_memory_id: string | null
          update_resumo: string | null
          url: string | null
        }
        Insert: {
          account_id: string
          briefing_id: string
          categoria: Database["public"]["Enums"]["cluster_category"]
          created_at?: string
          curator_pick_motivo?: string | null
          data_publicacao?: string | null
          em_alta?: boolean
          fonte?: string | null
          fts?: unknown
          heat_boost?: number
          heat_score?: number
          id?: string
          is_curator_pick?: boolean
          is_fallback?: boolean
          is_update?: boolean
          itens?: Json
          ordem: number
          portais_cobrindo?: Json
          previous_briefing_id?: string | null
          impacto_geral?: number | null
          relevancia_empresarial?: number | null
          relevancia_tecnica?: number | null
          relevancia_tema?: number | null
          resumo?: string | null
          tier_fonte?: number | null
          titulo: string
          topic_memory_id?: string | null
          update_resumo?: string | null
          url?: string | null
        }
        Update: {
          account_id?: string
          briefing_id?: string
          categoria?: Database["public"]["Enums"]["cluster_category"]
          created_at?: string
          curator_pick_motivo?: string | null
          data_publicacao?: string | null
          em_alta?: boolean
          fonte?: string | null
          fts?: unknown
          heat_boost?: number
          heat_score?: number
          id?: string
          is_curator_pick?: boolean
          is_fallback?: boolean
          is_update?: boolean
          itens?: Json
          ordem?: number
          portais_cobrindo?: Json
          previous_briefing_id?: string | null
          impacto_geral?: number | null
          relevancia_empresarial?: number | null
          relevancia_tecnica?: number | null
          relevancia_tema?: number | null
          resumo?: string | null
          tier_fonte?: number | null
          titulo?: string
          topic_memory_id?: string | null
          update_resumo?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clusters_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_previous_briefing_id_fkey"
            columns: ["previous_briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_topic_memory_fk"
            columns: ["topic_memory_id"]
            isOneToOne: false
            referencedRelation: "topic_memory"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_log: {
        Row: {
          account_id: string
          briefing_id: string
          channel: string
          created_at: string
          destination: string
          error: string | null
          id: number
          provider_response: Json | null
          status: string
        }
        Insert: {
          account_id: string
          briefing_id: string
          channel: string
          created_at?: string
          destination: string
          error?: string | null
          id?: never
          provider_response?: Json | null
          status: string
        }
        Update: {
          account_id?: string
          briefing_id?: string
          channel?: string
          created_at?: string
          destination?: string
          error?: string | null
          id?: never
          provider_response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_log_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          account_id: string
          attempts: number
          checkpoint: Json
          cost_usd: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          profile_id: string
          result: Json | null
          run_at: string
          run_date: string
          stage: string
          stage_log: Json
          status: Database["public"]["Enums"]["job_status"]
          tokens_input: number
          tokens_output: number
          type: string
        }
        Insert: {
          account_id: string
          attempts?: number
          checkpoint?: Json
          cost_usd?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          profile_id: string
          result?: Json | null
          run_at?: string
          run_date: string
          stage?: string
          stage_log?: Json
          status?: Database["public"]["Enums"]["job_status"]
          tokens_input?: number
          tokens_output?: number
          type?: string
        }
        Update: {
          account_id?: string
          attempts?: number
          checkpoint?: Json
          cost_usd?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          profile_id?: string
          result?: Json | null
          run_at?: string
          run_date?: string
          stage?: string
          stage_log?: Json
          status?: Database["public"]["Enums"]["job_status"]
          tokens_input?: number
          tokens_output?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "briefing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          account_id: string
          created_at: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          max_posts_per_day: number
          max_sources: number
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id: string
          max_posts_per_day?: number
          max_sources?: number
          name: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          max_posts_per_day?: number
          max_sources?: number
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          account_id: string
          angulo_descricao: string | null
          angulo_tipo: string | null
          briefing_id: string
          cluster_id: string | null
          created_at: string
          cta: string | null
          estrutura: Json | null
          formato: string | null
          gancho: string | null
          id: string
          justificativa_formato: string | null
          ordem: number
          skip: boolean
          skip_motivo: string | null
        }
        Insert: {
          account_id: string
          angulo_descricao?: string | null
          angulo_tipo?: string | null
          briefing_id: string
          cluster_id?: string | null
          created_at?: string
          cta?: string | null
          estrutura?: Json | null
          formato?: string | null
          gancho?: string | null
          id?: string
          justificativa_formato?: string | null
          ordem: number
          skip?: boolean
          skip_motivo?: string | null
        }
        Update: {
          account_id?: string
          angulo_descricao?: string | null
          angulo_tipo?: string | null
          briefing_id?: string
          cluster_id?: string | null
          created_at?: string
          cta?: string | null
          estrutura?: Json | null
          formato?: string | null
          gancho?: string | null
          id?: string
          justificativa_formato?: string | null
          ordem?: number
          skip?: boolean
          skip_motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      source_health_events: {
        Row: {
          account_id: string
          created_at: string
          error: string | null
          id: number
          items_found: number | null
          latency_ms: number | null
          method: string | null
          source_id: string
          status: Database["public"]["Enums"]["source_health_status"]
        }
        Insert: {
          account_id: string
          created_at?: string
          error?: string | null
          id?: never
          items_found?: number | null
          latency_ms?: number | null
          method?: string | null
          source_id: string
          status: Database["public"]["Enums"]["source_health_status"]
        }
        Update: {
          account_id?: string
          created_at?: string
          error?: string | null
          id?: never
          items_found?: number | null
          latency_ms?: number | null
          method?: string | null
          source_id?: string
          status?: Database["public"]["Enums"]["source_health_status"]
        }
        Relationships: [
          {
            foreignKeyName: "source_health_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_health_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          account_id: string
          active: boolean
          created_at: string
          credential_enc: string | null
          fallback_eligible: boolean
          feed_url: string | null
          handle: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_ok_at: string | null
          last_preview: Json | null
          last_status: Database["public"]["Enums"]["source_health_status"]
          name: string
          profile_id: string
          tier: number
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          url: string
        }
        Insert: {
          account_id: string
          active?: boolean
          created_at?: string
          credential_enc?: string | null
          fallback_eligible?: boolean
          feed_url?: string | null
          handle?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_ok_at?: string | null
          last_preview?: Json | null
          last_status?: Database["public"]["Enums"]["source_health_status"]
          name: string
          profile_id: string
          tier: number
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url: string
        }
        Update: {
          account_id?: string
          active?: boolean
          created_at?: string
          credential_enc?: string | null
          fallback_eligible?: boolean
          feed_url?: string | null
          handle?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_ok_at?: string | null
          last_preview?: Json | null
          last_status?: Database["public"]["Enums"]["source_health_status"]
          name?: string
          profile_id?: string
          tier?: number
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "briefing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          granted_by: string | null
          id: string
          notes: string | null
          plan_id: string
          source: Database["public"]["Enums"]["subscription_source"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          source: Database["public"]["Enums"]["subscription_source"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          source?: Database["public"]["Enums"]["subscription_source"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_sources: {
        Row: {
          active: boolean
          category: string
          country: string
          created_at: string
          description: string | null
          fallback_eligible: boolean
          feed_url: string | null
          id: string
          is_free: boolean
          language: string
          name: string
          requires_credential: boolean
          sort_order: number
          suggested_tier: number
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          category: string
          country?: string
          created_at?: string
          description?: string | null
          fallback_eligible?: boolean
          feed_url?: string | null
          id?: string
          is_free?: boolean
          language?: string
          name: string
          requires_credential?: boolean
          sort_order?: number
          suggested_tier: number
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          category?: string
          country?: string
          created_at?: string
          description?: string | null
          fallback_eligible?: boolean
          feed_url?: string | null
          id?: string
          is_free?: boolean
          language?: string
          name?: string
          requires_credential?: boolean
          sort_order?: number
          suggested_tier?: number
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      topic_memory: {
        Row: {
          account_id: string
          appearances: number
          canonical_title: string
          content_hash: string
          embedding: string
          entities: string[]
          first_briefing_id: string | null
          first_seen_at: string
          id: string
          last_briefing_id: string | null
          last_novel_at: string
          last_seen_at: string
          novelty_streak: number
          profile_id: string
          stale_days: number
          summary: string | null
          trend_score: number
        }
        Insert: {
          account_id: string
          appearances?: number
          canonical_title: string
          content_hash: string
          embedding: string
          entities?: string[]
          first_briefing_id?: string | null
          first_seen_at?: string
          id?: string
          last_briefing_id?: string | null
          last_novel_at?: string
          last_seen_at?: string
          novelty_streak?: number
          profile_id: string
          stale_days?: number
          summary?: string | null
          trend_score?: number
        }
        Update: {
          account_id?: string
          appearances?: number
          canonical_title?: string
          content_hash?: string
          embedding?: string
          entities?: string[]
          first_briefing_id?: string | null
          first_seen_at?: string
          id?: string
          last_briefing_id?: string | null
          last_novel_at?: string
          last_seen_at?: string
          novelty_streak?: number
          profile_id?: string
          stale_days?: number
          summary?: string | null
          trend_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_memory_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_memory_first_briefing_id_fkey"
            columns: ["first_briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_memory_last_briefing_id_fkey"
            columns: ["last_briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_memory_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "briefing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_destinations: {
        Row: {
          account_id: string
          active: boolean
          created_at: string
          id: string
          kind: string
          label: string | null
          phone: string
          profile_id: string
          updated_at: string
          verification_attempts: number
          verification_code: string | null
          verification_expires_at: string | null
          verification_sends: number
          verification_window: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          account_id: string
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          phone: string
          profile_id: string
          updated_at?: string
          verification_attempts?: number
          verification_code?: string | null
          verification_expires_at?: string | null
          verification_sends?: number
          verification_window?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          account_id?: string
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          phone?: string
          profile_id?: string
          updated_at?: string
          verification_attempts?: number
          verification_code?: string | null
          verification_expires_at?: string | null
          verification_sends?: number
          verification_window?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_destinations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_destinations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "briefing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_job_progress: {
        Args: {
          p_job_id: string
          p_entry: Json
          p_tokens_in: number
          p_tokens_out: number
          p_cost: number
        }
        Returns: undefined
      }
      resolve_short_link: {
        Args: {
          p_code: string
          p_user_agent: string | null
          p_referer: string | null
        }
        Returns: string | null
      }
      claim_next_job: {
        Args: { p_worker: string }
        Returns: {
          account_id: string
          attempts: number
          checkpoint: Json
          cost_usd: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          profile_id: string
          result: Json | null
          run_at: string
          run_date: string
          stage: string
          stage_log: Json
          status: Database["public"]["Enums"]["job_status"]
          tokens_input: number
          tokens_output: number
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      match_topic_memory: {
        Args: {
          p_count?: number
          p_embedding: string
          p_profile_id: string
          p_threshold?: number
          p_window_days?: number
        }
        Returns: {
          appearances: number
          canonical_title: string
          id: string
          last_briefing_id: string
          last_novel_at: string
          last_seen_at: string
          novelty_streak: number
          similarity: number
          stale_days: number
          summary: string
        }[]
      }
      requeue_stale_jobs: { Args: never; Returns: number }
    }
    Enums: {
      cluster_category:
        | "must_read"
        | "relevante"
        | "no_radar"
        | "sinal_sem_fonte"
        | "descartado"
        | "suprimido"
      job_status: "queued" | "running" | "done" | "failed"
      membership_role: "owner" | "admin" | "member"
      source_health_status: "pending" | "ok" | "partial" | "blocked" | "error"
      source_type: "rss" | "web" | "instagram"
      subscription_source: "admin_grant" | "stripe"
      subscription_status: "active" | "trialing" | "past_due" | "canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cluster_category: [
        "must_read",
        "relevante",
        "no_radar",
        "sinal_sem_fonte",
        "descartado",
        "suprimido",
      ],
      job_status: ["queued", "running", "done", "failed"],
      membership_role: ["owner", "admin", "member"],
      source_health_status: ["pending", "ok", "partial", "blocked", "error"],
      source_type: ["rss", "web", "instagram"],
      subscription_source: ["admin_grant", "stripe"],
      subscription_status: ["active", "trialing", "past_due", "canceled"],
    },
  },
} as const

