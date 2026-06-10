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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          category: string
          created_at: string
          id: string
          metadata: Json | null
          summary: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          category?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          category?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          summary?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      block_bookings: {
        Row: {
          amount_cents: number | null
          amount_paid_cents: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          location: string
          notes: string | null
          package_id: string | null
          paid_at: string | null
          phone: string | null
          preferred_date: string
          preferred_time: string
          shoot_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          amount_paid_cents?: number | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          location: string
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          phone?: string | null
          preferred_date: string
          preferred_time: string
          shoot_type: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          amount_paid_cents?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          location?: string
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          shoot_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      chat_timeouts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          issued_by: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          issued_by: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_timeouts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_word_filter: {
        Row: {
          added_by: string
          created_at: string
          id: string
          word: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          word: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
      deck_leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          investment_range: string
          investor_type: string
          website_or_linkedin: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          investment_range: string
          investor_type: string
          website_or_linkedin?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          investment_range?: string
          investor_type?: string
          website_or_linkedin?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          allowed_role: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          max_uses: number | null
          stream_id: string | null
          uses: number
        }
        Insert: {
          allowed_role?: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          max_uses?: number | null
          stream_id?: string | null
          uses?: number
        }
        Update: {
          allowed_role?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          max_uses?: number | null
          stream_id?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_submissions: {
        Row: {
          amount_cents: number
          artist_name: string
          audio_file_type: string | null
          audio_uploaded_at: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          paid_at: string | null
          photo_url: string | null
          queue_status: string
          song_link: string
          song_title: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier: string
          uploaded_audio_url: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          artist_name: string
          audio_file_type?: string | null
          audio_uploaded_at?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          paid_at?: string | null
          photo_url?: string | null
          queue_status?: string
          song_link: string
          song_title?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier: string
          uploaded_audio_url?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          artist_name?: string
          audio_file_type?: string | null
          audio_uploaded_at?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          paid_at?: string | null
          photo_url?: string | null
          queue_status?: string
          song_link?: string
          song_title?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier?: string
          uploaded_audio_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          live_alerts: boolean
          push: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          live_alerts?: boolean
          push?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          live_alerts?: boolean
          push?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          stream_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          stream_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          stream_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      play_boost_credits: {
        Row: {
          credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      play_memberships: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      play_sessions: {
        Row: {
          created_at: string
          current_track_id: string | null
          ended_at: string | null
          id: string
          started_at: string
          status: string
          stream_id: string
          updated_at: string
          winner_track_id: string | null
        }
        Insert: {
          created_at?: string
          current_track_id?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          stream_id: string
          updated_at?: string
          winner_track_id?: string | null
        }
        Update: {
          created_at?: string
          current_track_id?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          stream_id?: string
          updated_at?: string
          winner_track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "play_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: true
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      play_tracks: {
        Row: {
          artist_name: string
          artist_user_id: string | null
          audio_url: string | null
          boosted: boolean
          cover_url: string | null
          created_at: string
          dislike_count: number
          duration_seconds: number | null
          id: string
          like_count: number
          position: number
          score: number
          status: string
          stream_id: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_name: string
          artist_user_id?: string | null
          audio_url?: string | null
          boosted?: boolean
          cover_url?: string | null
          created_at?: string
          dislike_count?: number
          duration_seconds?: number | null
          id?: string
          like_count?: number
          position?: number
          score?: number
          status?: string
          stream_id: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_name?: string
          artist_user_id?: string | null
          audio_url?: string | null
          boosted?: boolean
          cover_url?: string | null
          created_at?: string
          dislike_count?: number
          duration_seconds?: number | null
          id?: string
          like_count?: number
          position?: number
          score?: number
          status?: string
          stream_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_tracks_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      play_votes: {
        Row: {
          created_at: string
          id: string
          track_id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "play_votes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_state: {
        Row: {
          cursor: number
          id: number
          pinned_id: string | null
          session_live: boolean
          updated_at: string
        }
        Insert: {
          cursor?: number
          id?: number
          pinned_id?: string | null
          session_live?: boolean
          updated_at?: string
        }
        Update: {
          cursor?: number
          id?: number
          pinned_id?: string | null
          session_live?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          genre: string | null
          id: string
          interests: string[] | null
          stage_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          genre?: string | null
          id: string
          interests?: string[] | null
          stage_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          genre?: string | null
          id?: string
          interests?: string[] | null
          stage_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      raise_hand_requests: {
        Row: {
          created_at: string
          id: string
          status: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raise_hand_requests_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_participants: {
        Row: {
          connection_status: string
          id: string
          joined_at: string
          last_seen_at: string
          muted_until: string | null
          stage_role: string
          stream_id: string
          user_id: string
        }
        Insert: {
          connection_status?: string
          id?: string
          joined_at?: string
          last_seen_at?: string
          muted_until?: string | null
          stage_role?: string
          stream_id: string
          user_id: string
        }
        Update: {
          connection_status?: string
          id?: string
          joined_at?: string
          last_seen_at?: string
          muted_until?: string | null
          stage_role?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_participants_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          stream_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          stream_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_queue: {
        Row: {
          created_at: string
          genre: string | null
          id: string
          position: number
          status: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          genre?: string | null
          id?: string
          position?: number
          status?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          genre?: string | null
          id?: string
          position?: number
          status?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_queue_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          host_id: string
          id: string
          public_url: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          host_id: string
          id?: string
          public_url?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          stream_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          host_id?: string
          id?: string
          public_url?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_recordings_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_studio_access_log: {
        Row: {
          action: string | null
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          route: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          route?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          route?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      streams: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          host_transfer_mode: string
          id: string
          mode: string
          room_name: string
          stage_locked: boolean
          started_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          host_transfer_mode?: string
          id?: string
          mode?: string
          room_name: string
          stage_locked?: boolean
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          host_transfer_mode?: string
          id?: string
          mode?: string
          room_name?: string
          stage_locked?: boolean
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number
        }
        Relationships: []
      }
      studio_bookings: {
        Row: {
          amount_cents: number | null
          amount_paid_cents: number | null
          created_at: string
          crew_size: string
          duration: string
          email: string
          full_name: string
          id: string
          notes: string | null
          package_id: string | null
          paid_at: string | null
          phone: string | null
          preferred_date: string
          preferred_time: string
          session_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          amount_paid_cents?: number | null
          created_at?: string
          crew_size: string
          duration: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          phone?: string | null
          preferred_date: string
          preferred_time: string
          session_type: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          amount_paid_cents?: number | null
          created_at?: string
          crew_size?: string
          duration?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          package_id?: string | null
          paid_at?: string | null
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          session_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount_cents: number
          created_at: string
          display_name: string | null
          id: string
          message: string | null
          paid_at: string | null
          status: string
          stream_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          display_name?: string | null
          id?: string
          message?: string | null
          paid_at?: string | null
          status?: string
          stream_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          display_name?: string | null
          id?: string
          message?: string | null
          paid_at?: string | null
          status?: string
          stream_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
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
      videos: {
        Row: {
          artist: string | null
          category: string
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          storage_path: string
          thumbnail_path: string | null
          title: string
          user_id: string
        }
        Insert: {
          artist?: string | null
          category?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          storage_path: string
          thumbnail_path?: string | null
          title: string
          user_id: string
        }
        Update: {
          artist?: string | null
          category?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          storage_path?: string
          thumbnail_path?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_queue_public: {
        Row: {
          artist_name: string | null
          audio_file_type: string | null
          audio_uploaded_at: string | null
          created_at: string | null
          id: string | null
          paid_at: string | null
          photo_url: string | null
          queue_status: string | null
          song_link: string | null
          song_title: string | null
          tier: string | null
          uploaded_audio_url: string | null
        }
        Insert: {
          artist_name?: string | null
          audio_file_type?: string | null
          audio_uploaded_at?: string | null
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          photo_url?: string | null
          queue_status?: string | null
          song_link?: string | null
          song_title?: string | null
          tier?: string | null
          uploaded_audio_url?: string | null
        }
        Update: {
          artist_name?: string | null
          audio_file_type?: string | null
          audio_uploaded_at?: string | null
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          photo_url?: string | null
          queue_status?: string | null
          song_link?: string | null
          song_title?: string | null
          tier?: string | null
          uploaded_audio_url?: string | null
        }
        Relationships: []
      }
      tips_public: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          display_name: string | null
          id: string | null
          message: string | null
          stream_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          message?: string | null
          stream_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          message?: string | null
          stream_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      consume_play_boost_credit: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_stream_tip_totals: {
        Args: { p_stream_id: string }
        Returns: {
          tip_count: number
          total_cents: number
        }[]
      }
      grant_play_boost_credits: {
        Args: { _credits: number; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_stream_host: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "host"
        | "artist"
        | "moderator"
        | "member"
        | "listener"
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
      app_role: [
        "admin",
        "user",
        "host",
        "artist",
        "moderator",
        "member",
        "listener",
      ],
    },
  },
} as const
