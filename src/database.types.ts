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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_models: {
        Row: {
          api_base_url: string
          api_key: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          model_id: string
          name: string
          reasoning_style: string | null
          search_params: Json | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          api_base_url: string
          api_key: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          model_id: string
          name: string
          reasoning_style?: string | null
          search_params?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          api_base_url?: string
          api_key?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          model_id?: string
          name?: string
          reasoning_style?: string | null
          search_params?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string
          id: boolean
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkin_activities: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          is_active: boolean
          note: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          note?: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          note?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      checkins: {
        Row: {
          accuracy: number | null
          activity_id: string
          cn: string
          created_at: string
          id: string
          latitude: number
          longitude: number
        }
        Insert: {
          accuracy?: number | null
          activity_id: string
          cn: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
        }
        Update: {
          accuracy?: number | null
          activity_id?: string
          cn?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
        }
        Relationships: [
          {
            foreignKeyName: "checkins_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "checkin_activities"
            referencedColumns: ["id"]
          }
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          current_participants: number
          description: string
          end_date: string
          end_time: string
          id: string
          image: string
          location: string
          max_participants: number
          organizer: string
          start_date: string
          start_time: string
          status: string
          tags: string[]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_participants?: number
          description?: string
          end_date: string
          end_time: string
          id?: string
          image?: string
          location?: string
          max_participants?: number
          organizer?: string
          start_date: string
          start_time: string
          status?: string
          tags?: string[]
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_participants?: number
          description?: string
          end_date?: string
          end_time?: string
          id?: string
          image?: string
          location?: string
          max_participants?: number
          organizer?: string
          start_date?: string
          start_time?: string
          status?: string
          tags?: string[]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_applications: {
        Row: {
          id: string
          event_id: string
          name: string
          phone: string
          qq: string
          note: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          phone?: string
          qq?: string
          note?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          phone?: string
          qq?: string
          note?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      join_applications: {
        Row: {
          created_at: string
          departments: string[]
          grade: string
          id: string
          intro: string
          major: string
          name: string
          phone: string
          qq: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          departments?: string[]
          grade: string
          id?: string
          intro?: string
          major?: string
          name: string
          phone: string
          qq: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          departments?: string[]
          grade?: string
          id?: string
          intro?: string
          major?: string
          name?: string
          phone?: string
          qq?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string
          id: string
          image: string
          pinned: boolean
          published_at: string | null
          status: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          image?: string
          pinned?: boolean
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          image?: string
          pinned?: boolean
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          created_at: string
          display_name: string
          email: string
          id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          display_name?: string
          email: string
          id: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          description: string
          href: string
          id: string
          image: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          href?: string
          id?: string
          image?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          href?: string
          id?: string
          image?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          activity_reminder: boolean
          announcement_banner: boolean
          club_description: string
          club_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          email_notification: boolean
          id: boolean
          logo_url: string
          new_member_notification: boolean
          new_work_notification: boolean
          open_registration: boolean
          redis_enabled: boolean
          site_description: string
          site_title: string
          updated_at: string
        }
        Insert: {
          activity_reminder?: boolean
          announcement_banner?: boolean
          club_description?: string
          club_name?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          email_notification?: boolean
          id?: boolean
          logo_url?: string
          new_member_notification?: boolean
          new_work_notification?: boolean
          open_registration?: boolean
          redis_enabled?: boolean
          site_description?: string
          site_title?: string
          updated_at?: string
        }
        Update: {
          activity_reminder?: boolean
          announcement_banner?: boolean
          club_description?: string
          club_name?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          email_notification?: boolean
          id?: boolean
          logo_url?: string
          new_member_notification?: boolean
          new_work_notification?: boolean
          open_registration?: boolean
          redis_enabled?: boolean
          site_description?: string
          site_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          bilibili_bvid: string
          cover: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          r2_key: string
          source_type: string
          source_url: string
          title: string
          updated_at: string
        }
        Insert: {
          bilibili_bvid?: string
          cover?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          r2_key?: string
          source_type: string
          source_url?: string
          title: string
          updated_at?: string
        }
        Update: {
          bilibili_bvid?: string
          cover?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          r2_key?: string
          source_type?: string
          source_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          work_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          work_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_likes_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          author_id: string | null
          category: string
          comments: number
          created_at: string
          description: string
          height: number | null
          id: string
          image: string
          likes: number
          status: string
          story: string
          title: string
          updated_at: string
          width: number | null
        }
        Insert: {
          author_id?: string | null
          category: string
          comments?: number
          created_at?: string
          description?: string
          height?: number | null
          id?: string
          image?: string
          likes?: number
          status?: string
          story?: string
          title: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string
          comments?: number
          created_at?: string
          description?: string
          height?: number | null
          id?: string
          image?: string
          likes?: number
          status?: string
          story?: string
          title?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "works_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
