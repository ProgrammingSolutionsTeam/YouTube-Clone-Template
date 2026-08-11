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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          details: Json | null
          id: string
          level: string
          user_id: string | null
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          user_id?: string | null
        }
        Relationships: []
      }
      library_roots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          name: string
          platform_hint: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          name: string
          platform_hint?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          name?: string
          platform_hint?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          channel_name: string | null
          created_at: string
          id: string
          playlist_id: string
          position: number
          title: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          id?: string
          playlist_id: string
          position?: number
          title?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          id?: string
          playlist_id?: string
          position?: number
          title?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          disabled: boolean
          display_name: string | null
          id: string
          language: string
          last_login: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          id: string
          language?: string
          last_login?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          disabled?: boolean
          display_name?: string | null
          id?: string
          language?: string
          last_login?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          autoplay_next: boolean
          muted: boolean
          playback_speed: number
          preferred_audio_language: string | null
          preferred_subtitle_language: string | null
          subtitle_background: string
          subtitle_background_opacity: number
          subtitle_color: string
          subtitle_delay: number
          subtitle_edge_style: string
          subtitle_font_family: string
          subtitle_font_size: number
          subtitle_position: number
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          autoplay_next?: boolean
          muted?: boolean
          playback_speed?: number
          preferred_audio_language?: string | null
          preferred_subtitle_language?: string | null
          subtitle_background?: string
          subtitle_background_opacity?: number
          subtitle_color?: string
          subtitle_delay?: number
          subtitle_edge_style?: string
          subtitle_font_family?: string
          subtitle_font_size?: number
          subtitle_position?: number
          updated_at?: string
          user_id: string
          volume?: number
        }
        Update: {
          autoplay_next?: boolean
          muted?: boolean
          playback_speed?: number
          preferred_audio_language?: string | null
          preferred_subtitle_language?: string | null
          subtitle_background?: string
          subtitle_background_opacity?: number
          subtitle_color?: string
          subtitle_delay?: number
          subtitle_edge_style?: string
          subtitle_font_family?: string
          subtitle_font_size?: number
          subtitle_position?: number
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          channel_name: string | null
          completed: boolean
          duration: number | null
          id: string
          last_position: number
          progress: number
          title: string | null
          user_id: string
          video_id: string
          watched_at: string
        }
        Insert: {
          channel_name?: string | null
          completed?: boolean
          duration?: number | null
          id?: string
          last_position?: number
          progress?: number
          title?: string | null
          user_id: string
          video_id: string
          watched_at?: string
        }
        Update: {
          channel_name?: string | null
          completed?: boolean
          duration?: number | null
          id?: string
          last_position?: number
          progress?: number
          title?: string | null
          user_id?: string
          video_id?: string
          watched_at?: string
        }
        Relationships: []
      }
      watch_later: {
        Row: {
          channel_name: string | null
          created_at: string
          id: string
          title: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
          video_id?: string
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
    }
    Enums: {
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
      app_role: ["admin", "user"],
    },
  },
} as const
