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
      account_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_code: string
          invited_by: string
          main_account_id: string
          role: Database["public"]["Enums"]["membership_role"]
          status: string
          sub_account_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_code?: string
          invited_by: string
          main_account_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
          sub_account_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          invited_by?: string
          main_account_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
          sub_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_invites_main_account_id_fkey"
            columns: ["main_account_id"]
            isOneToOne: false
            referencedRelation: "main_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_invites_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_memberships: {
        Row: {
          created_at: string
          id: string
          main_account_id: string
          role: Database["public"]["Enums"]["membership_role"]
          sub_account_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_account_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          sub_account_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_account_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          sub_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_memberships_main_account_id_fkey"
            columns: ["main_account_id"]
            isOneToOne: false
            referencedRelation: "main_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_memberships_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_channel_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      acquisition_channels: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "acquisition_channel_categories"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_action_instruction_blocks: {
        Row: {
          ai_action_id: string
          created_at: string
          id: string
          instruction_block_id: string
          sort_order: number
        }
        Insert: {
          ai_action_id: string
          created_at?: string
          id?: string
          instruction_block_id: string
          sort_order?: number
        }
        Update: {
          ai_action_id?: string
          created_at?: string
          id?: string
          instruction_block_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_instruction_blocks_ai_action_id_fkey"
            columns: ["ai_action_id"]
            isOneToOne: false
            referencedRelation: "ai_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_instruction_blocks_instruction_block_id_fkey"
            columns: ["instruction_block_id"]
            isOneToOne: false
            referencedRelation: "ai_instruction_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_actions: {
        Row: {
          created_at: string
          description: string
          id: string
          input_structure: Json
          is_active: boolean
          model_settings: Json
          name: string
          output_structure: Json
          prompt_template: string
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          input_structure?: Json
          is_active?: boolean
          model_settings?: Json
          name?: string
          output_structure?: Json
          prompt_template?: string
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          input_structure?: Json
          is_active?: boolean
          model_settings?: Json
          name?: string
          output_structure?: Json
          prompt_template?: string
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_coach_conversations: {
        Row: {
          context_snapshot: Json
          created_at: string
          id: string
          scope: string
          sub_account_id: string
          target_id: string | null
          target_label: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_snapshot?: Json
          created_at?: string
          id?: string
          scope: string
          sub_account_id: string
          target_id?: string | null
          target_label?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_snapshot?: Json
          created_at?: string
          id?: string
          scope?: string
          sub_account_id?: string
          target_id?: string | null
          target_label?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_conversations_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_memory: {
        Row: {
          created_at: string
          id: string
          key: string
          source_conversation_id: string | null
          sub_account_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          source_conversation_id?: string | null
          sub_account_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          source_conversation_id?: string | null
          sub_account_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_memory_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_coach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_memory_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_proposal_decisions: {
        Row: {
          conversation_id: string
          created_at: string
          decision: string
          id: string
          message_id: string | null
          path: string
          sub_account_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          decision: string
          id?: string
          message_id?: string | null
          path: string
          sub_account_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          decision?: string
          id?: string
          message_id?: string | null
          path?: string
          sub_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_proposal_decisions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_instruction_blocks: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_saved_views: {
        Row: {
          config: Json
          created_at: string
          funnel_id: string
          id: string
          is_default: boolean
          name: string
          sub_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          funnel_id: string
          id?: string
          is_default?: boolean
          name: string
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          funnel_id?: string
          id?: string
          is_default?: boolean
          name?: string
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_saved_views_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_saved_views_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
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
          sub_account_id: string | null
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
          sub_account_id?: string | null
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
          sub_account_id?: string | null
          target_audience?: string
          traffic_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_blueprints: {
        Row: {
          brand_strategy: Json
          created_at: string
          customer_clarity: Json
          growth_system: Json
          id: string
          offer_stack: Json
          proof_authority: Json
          share_token: string | null
          sub_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_strategy?: Json
          created_at?: string
          customer_clarity?: Json
          growth_system?: Json
          id?: string
          offer_stack?: Json
          proof_authority?: Json
          share_token?: string | null
          sub_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_strategy?: Json
          created_at?: string
          customer_clarity?: Json
          growth_system?: Json
          id?: string
          offer_stack?: Json
          proof_authority?: Json
          share_token?: string | null
          sub_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_blueprints_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      copy_components: {
        Row: {
          ai_action_slug: string
          config: Json
          created_at: string
          description: string
          headline_instruction_block_id: string | null
          headline_purpose: string
          icon: string
          id: string
          instructions: string
          is_active: boolean
          name: string
          output_structure: Json
          required_blueprint_fields: string[]
          slug: string
          sort_order: number
          ui_interface_slug: string
          updated_at: string
        }
        Insert: {
          ai_action_slug?: string
          config?: Json
          created_at?: string
          description?: string
          headline_instruction_block_id?: string | null
          headline_purpose?: string
          icon?: string
          id?: string
          instructions?: string
          is_active?: boolean
          name?: string
          output_structure?: Json
          required_blueprint_fields?: string[]
          slug: string
          sort_order?: number
          ui_interface_slug?: string
          updated_at?: string
        }
        Update: {
          ai_action_slug?: string
          config?: Json
          created_at?: string
          description?: string
          headline_instruction_block_id?: string | null
          headline_purpose?: string
          icon?: string
          id?: string
          instructions?: string
          is_active?: boolean
          name?: string
          output_structure?: Json
          required_blueprint_fields?: string[]
          slug?: string
          sort_order?: number
          ui_interface_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_components_headline_instruction_block_id_fkey"
            columns: ["headline_instruction_block_id"]
            isOneToOne: false
            referencedRelation: "ai_instruction_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_document_components: {
        Row: {
          component_slug: string
          created_at: string
          document_id: string
          id: string
          inputs: Json
          is_generated: boolean
          outputs: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          component_slug?: string
          created_at?: string
          document_id: string
          id?: string
          inputs?: Json
          is_generated?: boolean
          outputs?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          component_slug?: string
          created_at?: string
          document_id?: string
          id?: string
          inputs?: Json
          is_generated?: boolean
          outputs?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_document_components_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "copy_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_documents: {
        Row: {
          context_custom_text: string
          context_offer_id: string | null
          context_type: string
          created_at: string
          framework_id: string | null
          funnel_id: string | null
          funnel_node_id: string | null
          global_instructions: string
          id: string
          name: string
          status: string | null
          sub_account_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_custom_text?: string
          context_offer_id?: string | null
          context_type?: string
          created_at?: string
          framework_id?: string | null
          funnel_id?: string | null
          funnel_node_id?: string | null
          global_instructions?: string
          id?: string
          name?: string
          status?: string | null
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_custom_text?: string
          context_offer_id?: string | null
          context_type?: string
          created_at?: string
          framework_id?: string | null
          funnel_id?: string | null
          funnel_node_id?: string | null
          global_instructions?: string
          id?: string
          name?: string
          status?: string | null
          sub_account_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_documents_context_offer_id_fkey"
            columns: ["context_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_documents_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "copy_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_documents_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_documents_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_frameworks: {
        Row: {
          component_slugs: Json
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          component_slugs?: Json
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Update: {
          component_slugs?: Json
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
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
          period_end: string
          period_type: string
          sub_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          funnel_id: string
          id?: string
          period_end: string
          period_type?: string
          sub_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          funnel_id?: string
          id?: string
          period_end?: string
          period_type?: string
          sub_account_id?: string | null
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
          {
            foreignKeyName: "funnel_analytics_entries_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
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
          sub_account_id: string | null
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
          sub_account_id?: string | null
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
          sub_account_id?: string | null
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
          {
            foreignKeyName: "funnel_briefs_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
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
          seed_template_id: string | null
          share_token: string | null
          shared_view_id: string | null
          sub_account_id: string | null
          template_id: string | null
          template_type: string | null
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
          seed_template_id?: string | null
          share_token?: string | null
          shared_view_id?: string | null
          sub_account_id?: string | null
          template_id?: string | null
          template_type?: string | null
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
          seed_template_id?: string | null
          share_token?: string | null
          shared_view_id?: string | null
          sub_account_id?: string | null
          template_id?: string | null
          template_type?: string | null
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
            foreignKeyName: "funnels_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
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
      growth_architecture_channels: {
        Row: {
          architecture_system_id: string
          channel_id: string
          created_at: string
          id: string
          is_primary: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          architecture_system_id: string
          channel_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          architecture_system_id?: string
          channel_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_architecture_channels_architecture_system_id_fkey"
            columns: ["architecture_system_id"]
            isOneToOne: false
            referencedRelation: "growth_architecture_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_architecture_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "acquisition_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_architecture_systems: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          sort_order: number
          source_offer_id: string | null
          status: string
          sub_account_id: string
          system_catalog_id: string
          target_offer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          sort_order?: number
          source_offer_id?: string | null
          status?: string
          sub_account_id: string
          system_catalog_id: string
          target_offer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          sort_order?: number
          source_offer_id?: string | null
          status?: string
          sub_account_id?: string
          system_catalog_id?: string
          target_offer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_architecture_systems_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_architecture_systems_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_architecture_systems_system_catalog_id_fkey"
            columns: ["system_catalog_id"]
            isOneToOne: false
            referencedRelation: "growth_systems_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_architecture_systems_target_offer_id_fkey"
            columns: ["target_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_assessments: {
        Row: {
          ai_confidence: string | null
          ai_result: Json | null
          answers: Json
          claim_token: string | null
          computed_stage: string
          created_at: string
          gate_results: Json
          id: string
          is_active: boolean
          source: string
          stage_scores: Json
          sub_account_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_confidence?: string | null
          ai_result?: Json | null
          answers: Json
          claim_token?: string | null
          computed_stage: string
          created_at?: string
          gate_results: Json
          id?: string
          is_active?: boolean
          source: string
          stage_scores: Json
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_confidence?: string | null
          ai_result?: Json | null
          answers?: Json
          claim_token?: string | null
          computed_stage?: string
          created_at?: string
          gate_results?: Json
          id?: string
          is_active?: boolean
          source?: string
          stage_scores?: Json
          sub_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_assessments_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_funnel_mappings: {
        Row: {
          blueprint_id: string
          created_at: string
          funnel_type: string
          id: string
          next_offer_id: string | null
          offer_id: string | null
          purpose: string
          sort_order: number
          sub_account_id: string
          traffic_sources: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          funnel_type?: string
          id?: string
          next_offer_id?: string | null
          offer_id?: string | null
          purpose?: string
          sort_order?: number
          sub_account_id: string
          traffic_sources?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          funnel_type?: string
          id?: string
          next_offer_id?: string | null
          offer_id?: string | null
          purpose?: string
          sort_order?: number
          sub_account_id?: string
          traffic_sources?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_funnel_mappings_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "business_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_funnel_mappings_next_offer_id_fkey"
            columns: ["next_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_funnel_mappings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_funnel_mappings_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_roadmap_tasks: {
        Row: {
          activation_conditions: Json
          applicability_conditions: Json
          applicable_stages: string[]
          build_guide_ref: string | null
          coach_prompt_ref: string | null
          completion_conditions: Json
          created_at: string
          cta_label: string | null
          description: string
          id: string
          is_active: boolean
          resources: Json
          slug: string
          sort_order: number
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          activation_conditions?: Json
          applicability_conditions?: Json
          applicable_stages?: string[]
          build_guide_ref?: string | null
          coach_prompt_ref?: string | null
          completion_conditions?: Json
          created_at?: string
          cta_label?: string | null
          description?: string
          id?: string
          is_active?: boolean
          resources?: Json
          slug: string
          sort_order?: number
          stage: string
          title: string
          updated_at?: string
        }
        Update: {
          activation_conditions?: Json
          applicability_conditions?: Json
          applicable_stages?: string[]
          build_guide_ref?: string | null
          coach_prompt_ref?: string | null
          completion_conditions?: Json
          created_at?: string
          cta_label?: string | null
          description?: string
          id?: string
          is_active?: boolean
          resources?: Json
          slug?: string
          sort_order?: number
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      growth_stage_cycles: {
        Row: {
          created_at: string
          cycle_number: number
          ended_at: string | null
          ended_by_assessment_id: string | null
          ended_by_reason: string | null
          id: string
          milestone_attested_at: string | null
          milestone_attested_by: string | null
          stage: string
          started_at: string
          started_by_reason: string
          sub_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_number: number
          ended_at?: string | null
          ended_by_assessment_id?: string | null
          ended_by_reason?: string | null
          id?: string
          milestone_attested_at?: string | null
          milestone_attested_by?: string | null
          stage: string
          started_at?: string
          started_by_reason?: string
          sub_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_number?: number
          ended_at?: string | null
          ended_by_assessment_id?: string | null
          ended_by_reason?: string | null
          id?: string
          milestone_attested_at?: string | null
          milestone_attested_by?: string | null
          stage?: string
          started_at?: string
          started_by_reason?: string
          sub_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_stage_cycles_ended_by_assessment_id_fkey"
            columns: ["ended_by_assessment_id"]
            isOneToOne: false
            referencedRelation: "growth_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_stage_cycles_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_system_channel_compat: {
        Row: {
          acquisition_channel_id: string
          created_at: string
          growth_system_id: string
        }
        Insert: {
          acquisition_channel_id: string
          created_at?: string
          growth_system_id: string
        }
        Update: {
          acquisition_channel_id?: string
          created_at?: string
          growth_system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_system_channel_compat_acquisition_channel_id_fkey"
            columns: ["acquisition_channel_id"]
            isOneToOne: false
            referencedRelation: "acquisition_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_system_channel_compat_growth_system_id_fkey"
            columns: ["growth_system_id"]
            isOneToOne: false
            referencedRelation: "growth_systems_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_systems_catalog: {
        Row: {
          architecture: Json | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          primary_objective: string | null
          recommended_stages: string[]
          seed_template_id: string | null
          sort_order: number
          suitable_offer_tiers: string[]
          updated_at: string
        }
        Insert: {
          architecture?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          primary_objective?: string | null
          recommended_stages?: string[]
          seed_template_id?: string | null
          sort_order?: number
          suitable_offer_tiers?: string[]
          updated_at?: string
        }
        Update: {
          architecture?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          primary_objective?: string | null
          recommended_stages?: string[]
          seed_template_id?: string | null
          sort_order?: number
          suitable_offer_tiers?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_systems_catalog_seed_template_id_fkey"
            columns: ["seed_template_id"]
            isOneToOne: false
            referencedRelation: "seed_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_task_progress: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          created_at: string
          cycle_id: string | null
          id: string
          notes: string | null
          snoozed_until: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["growth_task_status"]
          sub_account_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          id?: string
          notes?: string | null
          snoozed_until?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["growth_task_status"]
          sub_account_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_id?: string | null
          id?: string
          notes?: string | null
          snoozed_until?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["growth_task_status"]
          sub_account_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_task_progress_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "growth_stage_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_task_progress_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "growth_roadmap_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_workspace_state: {
        Row: {
          created_at: string
          id: string
          state: Json
          sub_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          state?: Json
          sub_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          state?: Json
          sub_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_workspace_state_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
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
      main_accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["main_account_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["main_account_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["main_account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      offer_relationships: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          relationship_type: string
          source_offer_id: string
          sub_account_id: string
          target_offer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type: string
          source_offer_id: string
          sub_account_id: string
          target_offer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string
          source_offer_id?: string
          sub_account_id?: string
          target_offer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_relationships_source_offer_id_fkey"
            columns: ["source_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_relationships_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_relationships_target_offer_id_fkey"
            columns: ["target_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          blueprint_id: string | null
          completion: number
          created_at: string
          data: Json
          id: string
          name: string
          project_id: string | null
          share_token: string | null
          sort_order: number
          source: string
          status: string
          sub_account_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blueprint_id?: string | null
          completion?: number
          created_at?: string
          data?: Json
          id?: string
          name?: string
          project_id?: string | null
          share_token?: string | null
          sort_order?: number
          source?: string
          status?: string
          sub_account_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blueprint_id?: string | null
          completion?: number
          created_at?: string
          data?: Json
          id?: string
          name?: string
          project_id?: string | null
          share_token?: string | null
          sort_order?: number
          source?: string
          status?: string
          sub_account_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "business_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_lead_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          sub_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          sub_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          sub_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_lead_sources_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_leads: {
        Row: {
          archived_at: string | null
          company_name: string
          created_at: string
          deleted_at: string | null
          email: string
          followups_sent_at: Json
          fu1_sent_at: string | null
          fu2_sent_at: string | null
          fu3_sent_at: string | null
          fu4_sent_at: string | null
          id: string
          last_contact_at: string | null
          last_name: string
          lead_source: string
          link: string
          main_angle: string
          main_problem: string
          name: string
          next_followup_at: string | null
          niche: string
          notes: string
          offer: string
          opener_sent_at: string | null
          outreach_channel: Database["public"]["Enums"]["outreach_channel"]
          platform: string
          profile_url: string
          profile_url_2: string
          setup_type: string
          status: Database["public"]["Enums"]["outreach_status"]
          sub_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          company_name?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          followups_sent_at?: Json
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          fu4_sent_at?: string | null
          id?: string
          last_contact_at?: string | null
          last_name?: string
          lead_source?: string
          link?: string
          main_angle?: string
          main_problem?: string
          name?: string
          next_followup_at?: string | null
          niche?: string
          notes?: string
          offer?: string
          opener_sent_at?: string | null
          outreach_channel?: Database["public"]["Enums"]["outreach_channel"]
          platform?: string
          profile_url?: string
          profile_url_2?: string
          setup_type?: string
          status?: Database["public"]["Enums"]["outreach_status"]
          sub_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          company_name?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          followups_sent_at?: Json
          fu1_sent_at?: string | null
          fu2_sent_at?: string | null
          fu3_sent_at?: string | null
          fu4_sent_at?: string | null
          id?: string
          last_contact_at?: string | null
          last_name?: string
          lead_source?: string
          link?: string
          main_angle?: string
          main_problem?: string
          name?: string
          next_followup_at?: string | null
          niche?: string
          notes?: string
          offer?: string
          opener_sent_at?: string | null
          outreach_channel?: Database["public"]["Enums"]["outreach_channel"]
          platform?: string
          profile_url?: string
          profile_url_2?: string
          setup_type?: string
          status?: Database["public"]["Enums"]["outreach_status"]
          sub_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_leads_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          channel: Database["public"]["Enums"]["outreach_channel"]
          content: string
          created_at: string
          id: string
          lead_id: string
          message_type: string
          sent: boolean
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["outreach_channel"]
          content?: string
          created_at?: string
          id?: string
          lead_id: string
          message_type: string
          sent?: boolean
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["outreach_channel"]
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          message_type?: string
          sent?: boolean
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "outreach_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_settings: {
        Row: {
          ai_prompt_context: string
          created_at: string
          follow_up_templates: Json
          id: string
          messaging_rules: Json
          opener_template: string
          sub_account_id: string
          updated_at: string
        }
        Insert: {
          ai_prompt_context?: string
          created_at?: string
          follow_up_templates?: Json
          id?: string
          messaging_rules?: Json
          opener_template?: string
          sub_account_id: string
          updated_at?: string
        }
        Update: {
          ai_prompt_context?: string
          created_at?: string
          follow_up_templates?: Json
          id?: string
          messaging_rules?: Json
          opener_template?: string
          sub_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_settings_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_setup_types: {
        Row: {
          created_at: string
          default_action: string
          default_angle: string
          default_problem: string
          description: string
          id: string
          name: string
          sort_order: number
          sub_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_action?: string
          default_angle?: string
          default_problem?: string
          description?: string
          id?: string
          name?: string
          sort_order?: number
          sub_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_action?: string
          default_angle?: string
          default_problem?: string
          description?: string
          id?: string
          name?: string
          sort_order?: number
          sub_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_setup_types_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string
          first_name?: string
          id: string
          last_name?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          display_name?: string
          first_name?: string
          id?: string
          last_name?: string
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
          template_type: string | null
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
          template_type?: string | null
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
          template_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sub_accounts: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          main_account_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          main_account_id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          main_account_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_accounts_main_account_id_fkey"
            columns: ["main_account_id"]
            isOneToOne: false
            referencedRelation: "main_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_settings: {
        Row: {
          biggest_challenge: string
          business_type: string
          created_at: string
          currency: string
          help_achieve: string
          id: string
          main_goal: string
          setup_status: string
          sub_account_id: string
          updated_at: string
          who_help: string
        }
        Insert: {
          biggest_challenge?: string
          business_type?: string
          created_at?: string
          currency?: string
          help_achieve?: string
          id?: string
          main_goal?: string
          setup_status?: string
          sub_account_id: string
          updated_at?: string
          who_help?: string
        }
        Update: {
          biggest_challenge?: string
          business_type?: string
          created_at?: string
          currency?: string
          help_achieve?: string
          id?: string
          main_goal?: string
          setup_status?: string
          sub_account_id?: string
          updated_at?: string
          who_help?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: true
            referencedRelation: "sub_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copy_document_is_public: { Args: { _doc_id: string }; Returns: boolean }
      get_all_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      get_user_main_account: { Args: { _user_id: string }; Returns: string }
      get_user_main_accounts: { Args: { _user_id: string }; Returns: string[] }
      get_user_sub_accounts: { Args: { _user_id: string }; Returns: string[] }
      growth_cycle_transition: {
        Args: {
          _action: string
          _assessment_id?: string
          _expected_cycle_id?: string
          _from_stage?: string
          _reason?: string
          _stage?: string
          _sub_account_id: string
          _to_stage?: string
        }
        Returns: Json
      }
      growth_workspace_state_set: {
        Args: {
          _delete_keys?: string[]
          _patch?: Json
          _sub_account_id: string
        }
        Returns: Json
      }
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
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
      is_main_account_admin: {
        Args: { _main_id: string; _user_id: string }
        Returns: boolean
      }
      is_sub_account_member: {
        Args: { _sub_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "personal" | "agency" | "client"
      app_role: "admin" | "user"
      growth_task_status:
        | "locked"
        | "available"
        | "in_progress"
        | "completed"
        | "dismissed"
        | "snoozed"
      main_account_type: "standard" | "agency"
      membership_role:
        | "owner"
        | "admin"
        | "member"
        | "workspace_admin"
        | "workspace_member"
      outreach_channel: "dm" | "email"
      outreach_status:
        | "new"
        | "drafted"
        | "ready_to_send"
        | "sent"
        | "replied"
        | "interested"
        | "closed"
        | "no_response"
        | "not_interested"
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
      growth_task_status: [
        "locked",
        "available",
        "in_progress",
        "completed",
        "dismissed",
        "snoozed",
      ],
      main_account_type: ["standard", "agency"],
      membership_role: [
        "owner",
        "admin",
        "member",
        "workspace_admin",
        "workspace_member",
      ],
      outreach_channel: ["dm", "email"],
      outreach_status: [
        "new",
        "drafted",
        "ready_to_send",
        "sent",
        "replied",
        "interested",
        "closed",
        "no_response",
        "not_interested",
      ],
    },
  },
} as const
