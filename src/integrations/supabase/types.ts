export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agency_clients: {
        Row: {
          agency_user_id: string
          client_account_id: string | null
          client_user_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          agency_user_id: string
          client_account_id?: string | null
          client_user_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          agency_user_id?: string
          client_account_id?: string | null
          client_user_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_clients_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_invites: {
        Row: {
          agency_user_id: string
          created_at: string
          email: string
          id: string
          invite_code: string
          status: string
        }
        Insert: {
          agency_user_id: string
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          status?: string
        }
        Update: {
          agency_user_id?: string
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          status?: string
        }
        Relationships: []
      }
      asset_sections: {
        Row: {
          asset_id: string
          content: string | null
          created_at: string
          description: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          content?: string | null
          created_at?: string
          description?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          content?: string | null
          created_at?: string
          description?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_sections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          conversion_rate: string
          created_at: string
          email: string
          funnel_strategy: string
          id: string
          landing_page_content: string | null
          landing_page_screenshot: string | null
          landing_page_url: string
          monthly_traffic: string
          offer: string
          result: Json | null
          score: number | null
          target_audience: string
          traffic_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversion_rate?: string
          created_at?: string
          email?: string
          funnel_strategy?: string
          id?: string
          landing_page_content?: string | null
          landing_page_screenshot?: string | null
          landing_page_url?: string
          monthly_traffic?: string
          offer?: string
          result?: Json | null
          score?: number | null
          target_audience?: string
          traffic_source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversion_rate?: string
          created_at?: string
          email?: string
          funnel_strategy?: string
          id?: string
          landing_page_content?: string | null
          landing_page_screenshot?: string | null
          landing_page_url?: string
          monthly_traffic?: string
          offer?: string
          result?: Json | null
          score?: number | null
          target_audience?: string
          traffic_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_account_invites: {
        Row: {
          agency_user_id: string
          client_account_id: string
          created_at: string
          email: string
          id: string
          invite_code: string
          status: string
        }
        Insert: {
          agency_user_id: string
          client_account_id: string
          created_at?: string
          email: string
          id?: string
          invite_code?: string
          status?: string
        }
        Update: {
          agency_user_id?: string
          client_account_id?: string
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_account_invites_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_accounts: {
        Row: {
          agency_user_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          agency_user_id: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          agency_user_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_analytics_entries: {
        Row: {
          created_at: string
          date: string
          funnel_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          funnel_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          funnel_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_analytics_entries_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_briefs: {
        Row: {
          approved_fields: Json
          created_at: string
          funnel_id: string
          id: string
          is_approved: boolean
          share_permission: string
          share_token: string | null
          structure: Json
          updated_at: string
          user_id: string
          values: Json
        }
        Insert: {
          approved_fields?: Json
          created_at?: string
          funnel_id: string
          id?: string
          is_approved?: boolean
          share_permission?: string
          share_token?: string | null
          structure?: Json
          updated_at?: string
          user_id: string
          values?: Json
        }
        Update: {
          approved_fields?: Json
          created_at?: string
          funnel_id?: string
          id?: string
          is_approved?: boolean
          share_permission?: string
          share_token?: string | null
          structure?: Json
          updated_at?: string
          user_id?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "funnel_briefs_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: true
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_step_metrics: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          metrics: Json
          node_id: string
          node_label: string
          node_type: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          metrics?: Json
          node_id: string
          node_label?: string
          node_type?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          metrics?: Json
          node_id?: string
          node_label?: string
          node_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_step_metrics_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "funnel_analytics_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          is_template: boolean
          linked_offer_id: string | null
          name: string
          nodes: Json
          project_id: string | null
          share_token: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_template?: boolean
          linked_offer_id?: string | null
          name?: string
          nodes?: Json
          project_id?: string | null
          share_token?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_template?: boolean
          linked_offer_id?: string | null
          name?: string
          nodes?: Json
          project_id?: string | null
          share_token?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_linked_offer_id_fkey"
            columns: ["linked_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          completion: number
          created_at: string
          data: Json
          id: string
          name: string
          project_id: string | null
          share_token: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completion?: number
          created_at?: string
          data?: Json
          id?: string
          name?: string
          project_id?: string | null
          share_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completion?: number
          created_at?: string
          data?: Json
          id?: string
          name?: string
          project_id?: string | null
          share_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seed_templates: {
        Row: {
          brief_structure: Json
          created_at: string
          description: string | null
          edges: Json
          id: string
          is_active: boolean
          name: string
          nodes: Json
          updated_at: string
        }
        Insert: {
          brief_structure?: Json
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
        }
        Update: {
          brief_structure?: Json
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_of: {
        Args: { _agency_id: string; _client_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "personal" | "agency" | "client"
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      account_type: ["personal", "agency", "client"],
      app_role: ["admin", "user"],
    },
  },
} as const
