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
      suggested_sources: {
        Row: {
          active: boolean
          category: string
          country: string
          created_at: string
          description: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      membership_role: "owner" | "admin" | "member"
      source_health_status: "pending" | "ok" | "partial" | "blocked" | "error"
      source_type: "rss" | "web" | "instagram"
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
      membership_role: ["owner", "admin", "member"],
      source_health_status: ["pending", "ok", "partial", "blocked", "error"],
      source_type: ["rss", "web", "instagram"],
    },
  },
} as const

