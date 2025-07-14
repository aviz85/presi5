export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
          credits: number
          created_at: string
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          credits?: number
          created_at?: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          credits?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      presentations: {
        Row: {
          id: string
          user_id: string
          title: string
          content: Json
          markdown_content: string | null
          created_at: string
          updated_at: string | null
          is_public: boolean
          audio_generated: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: Json
          markdown_content?: string | null
          created_at?: string
          updated_at?: string | null
          is_public?: boolean
          audio_generated?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: Json
          markdown_content?: string | null
          created_at?: string
          updated_at?: string | null
          is_public?: boolean
          audio_generated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "presentations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audio_files: {
        Row: {
          id: string
          presentation_id: string
          file_name: string
          file_path: string
          element_id: string
          element_order: number
          duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          presentation_id: string
          file_name: string
          file_path: string
          element_id: string
          element_order: number
          duration?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          presentation_id?: string
          file_name?: string
          file_path?: string
          element_id?: string
          element_order?: number
          duration?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_credits: {
        Row: {
          id: string
          user_id: string
          credits_used: number
          action_type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credits_used: number
          action_type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credits_used?: number
          action_type?: string
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits: {
        Args: {
          user_uuid: string
          credits_amount: number
          action_description: string
          action_type_param?: string
        }
        Returns: boolean
      }
      add_credits: {
        Args: {
          user_uuid: string
          credits_amount: number
          action_description?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 