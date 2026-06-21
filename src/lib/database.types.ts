export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
      }
      campaign_recommendations: {
        Row: {
          id: string
          campaign_id: string
          workspace_id: string
          action_type: string
          confidence_score: number
          reasoning: string
          current_metrics: Json
          suggested_value: Json | null
          status: string
          applied_at: string | null
          dismissed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          workspace_id: string
          action_type: string
          confidence_score: number
          reasoning: string
          current_metrics?: Json
          suggested_value?: Json | null
          status?: string
          applied_at?: string | null
          dismissed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          workspace_id?: string
          action_type?: string
          confidence_score?: number
          reasoning?: string
          current_metrics?: Json
          suggested_value?: Json | null
          status?: string
          applied_at?: string | null
          dismissed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_forecasts: {
        Row: {
          id: string
          campaign_id: string | null
          workspace_id: string
          forecast_type: string
          forecast_period_days: number
          predicted_value: number
          confidence_lower: number | null
          confidence_upper: number | null
          confidence_level: number
          historical_data_points: number
          model_version: string
          generated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          workspace_id: string
          forecast_type: string
          forecast_period_days: number
          predicted_value: number
          confidence_lower?: number | null
          confidence_upper?: number | null
          confidence_level?: number
          historical_data_points?: number
          model_version?: string
          generated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          workspace_id?: string
          forecast_type?: string
          forecast_period_days?: number
          predicted_value?: number
          confidence_lower?: number | null
          confidence_upper?: number | null
          confidence_level?: number
          historical_data_points?: number
          model_version?: string
          generated_at?: string
          created_at?: string
        }
      }
      campaign_alerts: {
        Row: {
          id: string
          campaign_id: string
          workspace_id: string
          alert_type: string
          severity: string
          title: string
          message: string
          metric_name: string | null
          metric_value: number | null
          threshold_value: number | null
          previous_value: number | null
          status: string
          resolved_at: string | null
          dismissed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          workspace_id: string
          alert_type: string
          severity: string
          title: string
          message: string
          metric_name?: string | null
          metric_value?: number | null
          threshold_value?: number | null
          previous_value?: number | null
          status?: string
          resolved_at?: string | null
          dismissed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          workspace_id?: string
          alert_type?: string
          severity?: string
          title?: string
          message?: string
          metric_name?: string | null
          metric_value?: number | null
          threshold_value?: number | null
          previous_value?: number | null
          status?: string
          resolved_at?: string | null
          dismissed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      alert_dedup: {
        Row: {
          id: string
          alert_key: string
          alert_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alert_key: string
          alert_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alert_key?: string
          alert_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type UserProfile = Database['public']['Tables']['users']['Row']
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
