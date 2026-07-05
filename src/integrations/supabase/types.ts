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
      arena_events: {
        Row: {
          actor_id: string | null
          battle_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          stream_id: string | null
        }
        Insert: {
          actor_id?: string | null
          battle_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          stream_id?: string | null
        }
        Update: {
          actor_id?: string | null
          battle_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          stream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_events_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_events_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_playback_state: {
        Row: {
          created_at: string
          current_track_id: string | null
          id: string
          is_playing: boolean
          last_sync_at: string
          position_seconds: number
          stream_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          current_track_id?: string | null
          id?: string
          is_playing?: boolean
          last_sync_at?: string
          position_seconds?: number
          stream_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          current_track_id?: string | null
          id?: string
          is_playing?: boolean
          last_sync_at?: string
          position_seconds?: number
          stream_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_playback_state_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "arena_playback_state_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_playback_state_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: true
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_power_up_activations: {
        Row: {
          activated_at: string
          created_at: string
          credits_spent: number
          expires_at: string
          id: string
          metadata: Json
          power_up_id: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          created_at?: string
          credits_spent?: number
          expires_at: string
          id?: string
          metadata?: Json
          power_up_id: string
          user_id: string
        }
        Update: {
          activated_at?: string
          created_at?: string
          credits_spent?: number
          expires_at?: string
          id?: string
          metadata?: Json
          power_up_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_power_up_activations_power_up_id_fkey"
            columns: ["power_up_id"]
            isOneToOne: false
            referencedRelation: "arena_power_ups"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_power_ups: {
        Row: {
          accent: string | null
          active: boolean
          cost_credits: number
          created_at: string
          description: string
          duration_minutes: number
          icon: string | null
          id: string
          multiplier: number
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string | null
          active?: boolean
          cost_credits?: number
          created_at?: string
          description: string
          duration_minutes?: number
          icon?: string | null
          id?: string
          multiplier?: number
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string | null
          active?: boolean
          cost_credits?: number
          created_at?: string
          description?: string
          duration_minutes?: number
          icon?: string | null
          id?: string
          multiplier?: number
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_follows: {
        Row: {
          artist_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      artist_royalties: {
        Row: {
          artist_id: string
          artist_pool_cents: number
          created_at: string
          id: string
          metadata: Json
          month: string
          paid_at: string | null
          payout_amount_cents: number
          payout_request_id: string | null
          raw_streams: number
          share_pct: number
          status: string
          updated_at: string
          weighted_streams: number
        }
        Insert: {
          artist_id: string
          artist_pool_cents?: number
          created_at?: string
          id?: string
          metadata?: Json
          month: string
          paid_at?: string | null
          payout_amount_cents?: number
          payout_request_id?: string | null
          raw_streams?: number
          share_pct?: number
          status?: string
          updated_at?: string
          weighted_streams?: number
        }
        Update: {
          artist_id?: string
          artist_pool_cents?: number
          created_at?: string
          id?: string
          metadata?: Json
          month?: string
          paid_at?: string | null
          payout_amount_cents?: number
          payout_request_id?: string | null
          raw_streams?: number
          share_pct?: number
          status?: string
          updated_at?: string
          weighted_streams?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_royalties_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_vote_rollups: {
        Row: {
          artist_id: string
          bucket: string
          bucket_date: string
          updated_at: string
          votes: number
          weight: number
        }
        Insert: {
          artist_id: string
          bucket: string
          bucket_date: string
          updated_at?: string
          votes?: number
          weight?: number
        }
        Update: {
          artist_id?: string
          bucket?: string
          bucket_date?: string
          updated_at?: string
          votes?: number
          weight?: number
        }
        Relationships: []
      }
      artist_vote_totals: {
        Row: {
          artist_id: string
          last_vote_at: string | null
          lifetime_votes: number
          lifetime_weight: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          last_vote_at?: string | null
          lifetime_votes?: number
          lifetime_weight?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          last_vote_at?: string | null
          lifetime_votes?: number
          lifetime_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      battle_matches: {
        Row: {
          a_wins: number
          active_side: string | null
          artist_a_id: string
          artist_a_name: string | null
          artist_b_id: string
          artist_b_name: string | null
          b_wins: number
          created_at: string
          current_round: number
          current_round_id: string | null
          ended_at: string | null
          host_id: string
          id: string
          round_seconds: number
          started_at: string | null
          status: string
          stream_id: string
          total_rounds: number
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          a_wins?: number
          active_side?: string | null
          artist_a_id: string
          artist_a_name?: string | null
          artist_b_id: string
          artist_b_name?: string | null
          b_wins?: number
          created_at?: string
          current_round?: number
          current_round_id?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          round_seconds?: number
          started_at?: string | null
          status?: string
          stream_id: string
          total_rounds?: number
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          a_wins?: number
          active_side?: string | null
          artist_a_id?: string
          artist_a_name?: string | null
          artist_b_id?: string
          artist_b_name?: string | null
          b_wins?: number
          created_at?: string
          current_round?: number
          current_round_id?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          round_seconds?: number
          started_at?: string | null
          status?: string
          stream_id?: string
          total_rounds?: number
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_matches_current_round_id_fkey"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "battle_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_matches_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_reactions: {
        Row: {
          action: Database["public"]["Enums"]["battle_reaction_action"]
          artist_id: string
          battle_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["battle_reaction_action"]
          artist_id: string
          battle_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["battle_reaction_action"]
          artist_id?: string
          battle_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_reactions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_rounds: {
        Row: {
          a_playing_track_id: string | null
          a_track_finished_at: string | null
          a_votes: number
          a_weight: number
          b_playing_track_id: string | null
          b_track_finished_at: string | null
          b_votes: number
          b_weight: number
          created_at: string
          ends_at: string | null
          id: string
          match_id: string
          round_number: number
          started_at: string | null
          status: string
          updated_at: string
          voting_status: string
          winner_choice: string | null
        }
        Insert: {
          a_playing_track_id?: string | null
          a_track_finished_at?: string | null
          a_votes?: number
          a_weight?: number
          b_playing_track_id?: string | null
          b_track_finished_at?: string | null
          b_votes?: number
          b_weight?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          match_id: string
          round_number: number
          started_at?: string | null
          status?: string
          updated_at?: string
          voting_status?: string
          winner_choice?: string | null
        }
        Update: {
          a_playing_track_id?: string | null
          a_track_finished_at?: string | null
          a_votes?: number
          a_weight?: number
          b_playing_track_id?: string | null
          b_track_finished_at?: string | null
          b_votes?: number
          b_weight?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          match_id?: string
          round_number?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          voting_status?: string
          winner_choice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_rounds_a_playing_track_id_fkey"
            columns: ["a_playing_track_id"]
            isOneToOne: false
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "battle_rounds_a_playing_track_id_fkey"
            columns: ["a_playing_track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_rounds_b_playing_track_id_fkey"
            columns: ["b_playing_track_id"]
            isOneToOne: false
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "battle_rounds_b_playing_track_id_fkey"
            columns: ["b_playing_track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_scores: {
        Row: {
          artist_id: string
          battle_id: string
          hype_score: number
          id: string
          pass_score: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          battle_id: string
          hype_score?: number
          id?: string
          pass_score?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          battle_id?: string
          hype_score?: number
          id?: string
          pass_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_scores_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_vote_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          match_id: string | null
          metadata: Json
          outcome: string
          reason: string
          user_agent: string | null
          voter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          match_id?: string | null
          metadata?: Json
          outcome: string
          reason: string
          user_agent?: string | null
          voter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          match_id?: string | null
          metadata?: Json
          outcome?: string
          reason?: string
          user_agent?: string | null
          voter_id?: string | null
        }
        Relationships: []
      }
      battle_votes: {
        Row: {
          choice: string
          created_at: string
          id: string
          ip_address: unknown
          match_id: string
          round_id: string
          session_id: string | null
          user_agent: string | null
          voter_id: string
          weight: number
        }
        Insert: {
          choice: string
          created_at?: string
          id?: string
          ip_address?: unknown
          match_id: string
          round_id: string
          session_id?: string | null
          user_agent?: string | null
          voter_id: string
          weight?: number
        }
        Update: {
          choice?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          match_id?: string
          round_id?: string
          session_id?: string | null
          user_agent?: string | null
          voter_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "battle_rounds"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      boost_credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      boost_credit_packs: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          currency: string
          id: string
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          currency?: string
          id: string
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      boost_spends: {
        Row: {
          created_at: string
          credits_cost: number
          expires_at: string
          id: string
          ledger_id: string | null
          track_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          credits_cost: number
          expires_at?: string
          id?: string
          ledger_id?: string | null
          track_id: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          credits_cost?: number
          expires_at?: string
          id?: string
          ledger_id?: string | null
          track_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "boost_spends_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "boost_credit_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_spends_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "boost_spends_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_spends_access_audit: {
        Row: {
          action: string
          actor_id: string | null
          context: Json | null
          created_at: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      broadcast_stage_links: {
        Row: {
          broadcast_id: string
          created_at: string
          role: string
          stage_room_id: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          role?: string
          stage_room_id: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          role?: string
          stage_room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_stage_links_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_stage_links_stage_room_id_fkey"
            columns: ["stage_room_id"]
            isOneToOne: false
            referencedRelation: "stage_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          featured_content: Json
          host_id: string
          id: string
          playback_source: Json
          scheduled_for: string | null
          started_at: string | null
          stream_status: string
          stream_title: string
          updated_at: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          featured_content?: Json
          host_id: string
          id?: string
          playback_source?: Json
          scheduled_for?: string | null
          started_at?: string | null
          stream_status?: string
          stream_title?: string
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          featured_content?: Json
          host_id?: string
          id?: string
          playback_source?: Json
          scheduled_for?: string | null
          started_at?: string | null
          stream_status?: string
          stream_title?: string
          updated_at?: string
          viewer_count?: number
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
      connected_apps: {
        Row: {
          account_label: string | null
          connected_at: string
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          connected_at?: string
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          connected_at?: string
          id?: string
          provider?: string
          user_id?: string
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
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
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
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          link_url: string | null
          location: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          link_url?: string | null
          location?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          link_url?: string | null
          location?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
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
      matchmaking_pool: {
        Row: {
          enqueued_at: string
          id: string
          matched_battle_id: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
          xp_snapshot: number
        }
        Insert: {
          enqueued_at?: string
          id?: string
          matched_battle_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
          xp_snapshot?: number
        }
        Update: {
          enqueued_at?: string
          id?: string
          matched_battle_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          xp_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_pool_matched_battle_id_fkey"
            columns: ["matched_battle_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_commissions: {
        Row: {
          artist_tier: string
          commission_cents: number
          commission_rate: number
          created_at: string
          currency: string | null
          id: string
          order_number: string | null
          order_total_cents: number
          shopify_order_id: number
          status: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          artist_tier?: string
          commission_cents: number
          commission_rate: number
          created_at?: string
          currency?: string | null
          id?: string
          order_number?: string | null
          order_total_cents: number
          shopify_order_id: number
          status?: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          artist_tier?: string
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          currency?: string | null
          id?: string
          order_number?: string | null
          order_total_cents?: number
          shopify_order_id?: number
          status?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_commissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_products: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          handle: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          max_price_cents: number | null
          min_price_cents: number | null
          product_type: string | null
          shopify_product_id: number
          status: string | null
          store_id: string
          tags: string[] | null
          title: string
          total_inventory: number | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          max_price_cents?: number | null
          min_price_cents?: number | null
          product_type?: string | null
          shopify_product_id: number
          status?: string | null
          store_id: string
          tags?: string[] | null
          title: string
          total_inventory?: number | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          handle?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          max_price_cents?: number | null
          min_price_cents?: number | null
          product_type?: string | null
          shopify_product_id?: number
          status?: string | null
          store_id?: string
          tags?: string[] | null
          title?: string
          total_inventory?: number | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merch_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_variants: {
        Row: {
          available: boolean
          compare_at_price_cents: number | null
          created_at: string
          id: string
          image_url: string | null
          inventory_quantity: number | null
          option1: string | null
          option2: string | null
          option3: string | null
          price_cents: number
          product_id: string
          shopify_variant_id: number
          sku: string | null
          title: string | null
        }
        Insert: {
          available?: boolean
          compare_at_price_cents?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price_cents: number
          product_id: string
          shopify_variant_id: number
          sku?: string | null
          title?: string | null
        }
        Update: {
          available?: boolean
          compare_at_price_cents?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price_cents?: number
          product_id?: string
          shopify_variant_id?: number
          sku?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merch_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merch_products"
            referencedColumns: ["id"]
          },
        ]
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
      payout_accounts: {
        Row: {
          auto_payout_enabled: boolean
          charges_enabled: boolean
          country: string | null
          created_at: string
          default_currency: string
          details_submitted: boolean
          environment: string
          id: string
          minimum_payout_cents: number
          payouts_enabled: boolean
          requirements: Json
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_payout_enabled?: boolean
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          default_currency?: string
          details_submitted?: boolean
          environment?: string
          id?: string
          minimum_payout_cents?: number
          payouts_enabled?: boolean
          requirements?: Json
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_payout_enabled?: boolean
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          default_currency?: string
          details_submitted?: boolean
          environment?: string
          id?: string
          minimum_payout_cents?: number
          payouts_enabled?: boolean
          requirements?: Json
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          failure_reason: string | null
          id: string
          metadata: Json
          payout_account_id: string | null
          processed_at: string | null
          requested_at: string
          status: string
          stripe_destination_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          payout_account_id?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          stripe_destination_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          payout_account_id?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          stripe_destination_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      play_arena_submissions: {
        Row: {
          arena_id: string
          artist_id: string
          completed_at: string | null
          context: Json
          created_at: string
          id: string
          play_track_id: string | null
          priority: string
          song_id: string
          started_at: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          arena_id: string
          artist_id: string
          completed_at?: string | null
          context?: Json
          created_at?: string
          id?: string
          play_track_id?: string | null
          priority?: string
          song_id: string
          started_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          arena_id?: string
          artist_id?: string
          completed_at?: string | null
          context?: Json
          created_at?: string
          id?: string
          play_track_id?: string | null
          priority?: string
          song_id?: string
          started_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_arena_submissions_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_arena_submissions_play_track_id_fkey"
            columns: ["play_track_id"]
            isOneToOne: false
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "play_arena_submissions_play_track_id_fkey"
            columns: ["play_track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
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
          battle_match_id: string | null
          battle_side: string | null
          boost_weight: number
          boosted: boolean
          cover_url: string | null
          created_at: string
          dislike_count: number
          duration_seconds: number | null
          id: string
          like_count: number
          play_count: number
          position: number
          rank_score: number
          rank_updated_at: string
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
          battle_match_id?: string | null
          battle_side?: string | null
          boost_weight?: number
          boosted?: boolean
          cover_url?: string | null
          created_at?: string
          dislike_count?: number
          duration_seconds?: number | null
          id?: string
          like_count?: number
          play_count?: number
          position?: number
          rank_score?: number
          rank_updated_at?: string
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
          battle_match_id?: string | null
          battle_side?: string | null
          boost_weight?: number
          boosted?: boolean
          cover_url?: string | null
          created_at?: string
          dislike_count?: number
          duration_seconds?: number | null
          id?: string
          like_count?: number
          play_count?: number
          position?: number
          rank_score?: number
          rank_updated_at?: string
          score?: number
          status?: string
          stream_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_tracks_battle_match_id_fkey"
            columns: ["battle_match_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
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
          audio_idx: number
          cursor: number
          id: number
          pinned_id: string | null
          playing: boolean
          session_live: boolean
          updated_at: string
        }
        Insert: {
          audio_idx?: number
          cursor?: number
          id?: number
          pinned_id?: string | null
          playing?: boolean
          session_live?: boolean
          updated_at?: string
        }
        Update: {
          audio_idx?: number
          cursor?: number
          id?: number
          pinned_id?: string | null
          playing?: boolean
          session_live?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          brand_avatar_url: string | null
          brand_name: string | null
          created_at: string
          display_name: string | null
          featured_track_id: string | null
          featured_video_id: string | null
          genre: string | null
          genres: string[] | null
          id: string
          member_since: string | null
          public_id: string
          stage_name: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_avatar_url?: string | null
          brand_name?: string | null
          created_at?: string
          display_name?: string | null
          featured_track_id?: string | null
          featured_video_id?: string | null
          genre?: string | null
          genres?: string[] | null
          id: string
          member_since?: string | null
          public_id?: string
          stage_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_avatar_url?: string | null
          brand_name?: string | null
          created_at?: string
          display_name?: string | null
          featured_track_id?: string | null
          featured_video_id?: string | null
          genre?: string | null
          genres?: string[] | null
          id?: string
          member_since?: string | null
          public_id?: string
          stage_name?: string | null
          updated_at?: string
          username?: string | null
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
      rate_limit_hits: {
        Row: {
          action: string
          bucket_key: string
          created_at: string
          id: number
        }
        Insert: {
          action: string
          bucket_key: string
          created_at?: string
          id?: number
        }
        Update: {
          action?: string
          bucket_key?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      request_idempotency: {
        Row: {
          action: string
          created_at: string
          id: number
          idempotency_key: string
          response: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          idempotency_key: string
          response?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          idempotency_key?: string
          response?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      revenue_ledger: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          month: string
          processed: boolean
          source_id: string
          source_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          month: string
          processed?: boolean
          source_id: string
          source_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          month?: string
          processed?: boolean
          source_id?: string
          source_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      revenue_pool_entries: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          metadata: Json
          month: string
          reference_id: string | null
          reference_type: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          metadata?: Json
          month: string
          reference_id?: string | null
          reference_type?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          metadata?: Json
          month?: string
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      revenue_pools: {
        Row: {
          ads_revenue_cents: number
          artist_pool_cents: number
          artist_revenue_cents: number
          computed_at: string
          created_at: string
          id: string
          incentive_pool_cents: number
          listener_revenue_cents: number
          month: string
          platform_pool_cents: number
          tips_revenue_cents: number
          total_revenue_cents: number
          updated_at: string
        }
        Insert: {
          ads_revenue_cents?: number
          artist_pool_cents?: number
          artist_revenue_cents?: number
          computed_at?: string
          created_at?: string
          id?: string
          incentive_pool_cents?: number
          listener_revenue_cents?: number
          month: string
          platform_pool_cents?: number
          tips_revenue_cents?: number
          total_revenue_cents?: number
          updated_at?: string
        }
        Update: {
          ads_revenue_cents?: number
          artist_pool_cents?: number
          artist_revenue_cents?: number
          computed_at?: string
          created_at?: string
          id?: string
          incentive_pool_cents?: number
          listener_revenue_cents?: number
          month?: string
          platform_pool_cents?: number
          tips_revenue_cents?: number
          total_revenue_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      shopify_store_credentials: {
        Row: {
          access_token: string
          store_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          store_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_store_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_stores: {
        Row: {
          connected_at: string
          created_at: string
          currency: string | null
          id: string
          last_synced_at: string | null
          scope: string | null
          shop_domain: string
          shop_email: string | null
          shop_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          currency?: string | null
          id?: string
          last_synced_at?: string | null
          scope?: string | null
          shop_domain: string
          shop_email?: string | null
          shop_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          currency?: string | null
          id?: string
          last_synced_at?: string | null
          scope?: string | null
          shop_domain?: string
          shop_email?: string | null
          shop_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signed_audio_access_log: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          outcome: string
          reason: string
          storage_path: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          outcome: string
          reason: string
          storage_path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          outcome?: string
          reason?: string
          storage_path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stage_participants: {
        Row: {
          allow_camera: boolean
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
          allow_camera?: boolean
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
          allow_camera?: boolean
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
      stage_rooms: {
        Row: {
          audience_count: number
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          livekit_room: string
          stage_state: Json
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_count?: number
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          livekit_room: string
          stage_state?: Json
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          audience_count?: number
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          livekit_room?: string
          stage_state?: Json
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stream_anomaly_flags: {
        Row: {
          anomaly_score: number
          artist_id: string | null
          bot_score: number
          created_at: string
          id: string
          metadata: Json
          reasons: string[]
          stream_event_id: string | null
          track_id: string | null
          user_id: string | null
        }
        Insert: {
          anomaly_score?: number
          artist_id?: string | null
          bot_score?: number
          created_at?: string
          id?: string
          metadata?: Json
          reasons?: string[]
          stream_event_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Update: {
          anomaly_score?: number
          artist_id?: string | null
          bot_score?: number
          created_at?: string
          id?: string
          metadata?: Json
          reasons?: string[]
          stream_event_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_anomaly_flags_stream_event_id_fkey"
            columns: ["stream_event_id"]
            isOneToOne: false
            referencedRelation: "stream_events"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_events: {
        Row: {
          anomaly_reasons: string[]
          anomaly_score: number
          artist_id: string | null
          bot_score: number
          client_session_id: string | null
          created_at: string
          duration_played_seconds: number
          engagement_score: number
          full_listen: boolean
          id: string
          is_suspicious: boolean
          liked: boolean
          metadata: Json
          saved: boolean
          shared: boolean
          stream_environment: string
          track_id: string
          user_id: string | null
          user_multiplier: number
          user_tier: string
          valid_stream: boolean
          weighted_value: number
        }
        Insert: {
          anomaly_reasons?: string[]
          anomaly_score?: number
          artist_id?: string | null
          bot_score?: number
          client_session_id?: string | null
          created_at?: string
          duration_played_seconds?: number
          engagement_score?: number
          full_listen?: boolean
          id?: string
          is_suspicious?: boolean
          liked?: boolean
          metadata?: Json
          saved?: boolean
          shared?: boolean
          stream_environment?: string
          track_id: string
          user_id?: string | null
          user_multiplier?: number
          user_tier?: string
          valid_stream?: boolean
          weighted_value?: number
        }
        Update: {
          anomaly_reasons?: string[]
          anomaly_score?: number
          artist_id?: string | null
          bot_score?: number
          client_session_id?: string | null
          created_at?: string
          duration_played_seconds?: number
          engagement_score?: number
          full_listen?: boolean
          id?: string
          is_suspicious?: boolean
          liked?: boolean
          metadata?: Json
          saved?: boolean
          shared?: boolean
          stream_environment?: string
          track_id?: string
          user_id?: string | null
          user_multiplier?: number
          user_tier?: string
          valid_stream?: boolean
          weighted_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "stream_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "play_track_boost_totals"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "stream_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "play_tracks"
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
          spotlight_host_user_id: string | null
          spotlight_user_id: string | null
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
          spotlight_host_user_id?: string | null
          spotlight_user_id?: string | null
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
          spotlight_host_user_id?: string | null
          spotlight_user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      submission_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          failure_reason: string | null
          id: string
          metadata: Json
          paid_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          submission_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          submission_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          submission_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_payments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "live_queue_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_payments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "live_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          plan_type: string | null
          price_cents: number | null
          price_id: string
          product_id: string
          renewal_date: string | null
          role: string | null
          start_date: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan_type?: string | null
          price_cents?: number | null
          price_id: string
          product_id: string
          renewal_date?: string | null
          role?: string | null
          start_date?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan_type?: string | null
          price_cents?: number | null
          price_id?: string
          product_id?: string
          renewal_date?: string | null
          role?: string | null
          start_date?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string
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
          artist_id: string | null
          created_at: string
          display_name: string | null
          id: string
          kind: string
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
          artist_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          kind?: string
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
          artist_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          kind?: string
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
            foreignKeyName: "tips_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      track_likes: {
        Row: {
          created_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          app_settings: Json
          created_at: string
          email: string | null
          interests: string[] | null
          location: string | null
          notification_preferences: Json
          stripe_connect_account_id: string | null
          stripe_customer_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_settings?: Json
          created_at?: string
          email?: string | null
          interests?: string[] | null
          location?: string | null
          notification_preferences?: Json
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_settings?: Json
          created_at?: string
          email?: string | null
          interests?: string[] | null
          location?: string | null
          notification_preferences?: Json
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_presence: {
        Row: {
          last_seen_at: string
          online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          online?: boolean
          updated_at?: string
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
      user_settings: {
        Row: {
          accent_color: string
          audio_quality: string
          autoplay: boolean
          crossfade_seconds: number
          email_marketing: boolean
          email_product: boolean
          language: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string
          audio_quality?: string
          autoplay?: boolean
          crossfade_seconds?: number
          email_marketing?: boolean
          email_product?: boolean
          language?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string
          audio_quality?: string
          autoplay?: boolean
          crossfade_seconds?: number
          email_marketing?: boolean
          email_product?: boolean
          language?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_social_links: {
        Row: {
          created_at: string
          enabled: boolean
          handle: string | null
          id: string
          provider: string
          sort_order: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          handle?: string | null
          id?: string
          provider: string
          sort_order?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          handle?: string | null
          id?: string
          provider?: string
          sort_order?: number
          updated_at?: string
          url?: string
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
      waitlist_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
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
      xp_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      arena_leaderboard: {
        Row: {
          avatar_url: string | null
          losses: number | null
          name: string | null
          public_id: string | null
          rank: number | null
          total_battles: number | null
          total_stream_seconds: number | null
          total_votes: number | null
          user_id: string | null
          username: string | null
          win_rate: number | null
          wins: number | null
          xp: number | null
        }
        Relationships: []
      }
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
      play_track_boost_totals: {
        Row: {
          recent_weight: number | null
          stream_id: string | null
          total_weight: number | null
          track_id: string | null
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
      public_profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          brand_avatar_url: string | null
          brand_name: string | null
          created_at: string | null
          display_name: string | null
          featured_track_id: string | null
          featured_video_id: string | null
          genre: string | null
          genres: string[] | null
          id: string | null
          member_since: string | null
          public_id: string | null
          stage_name: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_avatar_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          display_name?: string | null
          featured_track_id?: string | null
          featured_video_id?: string | null
          genre?: string | null
          genres?: string[] | null
          id?: string | null
          member_since?: string | null
          public_id?: string | null
          stage_name?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          brand_avatar_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          display_name?: string | null
          featured_track_id?: string | null
          featured_video_id?: string | null
          genre?: string | null
          genres?: string[] | null
          id?: string | null
          member_since?: string | null
          public_id?: string | null
          stage_name?: string | null
          username?: string | null
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
      activate_power_up: {
        Args: { _slug: string }
        Returns: {
          activation_id: string
          expires_at: string
          new_balance: number
        }[]
      }
      award_xp: {
        Args: {
          _delta: number
          _metadata?: Json
          _reason: string
          _reference_id?: string
          _user_id: string
        }
        Returns: number
      }
      battle_vote_target_artist: {
        Args: { _choice: string; _match_id: string }
        Returns: string
      }
      boost_spends_access_check: {
        Args: { _row_user_id: string }
        Returns: boolean
      }
      calculate_artist_royalties: {
        Args: { _month?: string }
        Returns: {
          artists_paid: number
          total_payout_cents: number
        }[]
      }
      calculate_monthly_revenue_pool: {
        Args: { _month?: string }
        Returns: {
          ads_revenue_cents: number
          artist_pool_cents: number
          artist_revenue_cents: number
          computed_at: string
          created_at: string
          id: string
          incentive_pool_cents: number
          listener_revenue_cents: number
          month: string
          platform_pool_cents: number
          tips_revenue_cents: number
          total_revenue_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "revenue_pools"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cast_battle_vote: {
        Args: {
          _choice: string
          _ip?: string
          _round_id: string
          _use_boost?: boolean
          _user_agent?: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action: string
          _bucket_key: string
          _max_hits: number
          _window_secs: number
        }
        Returns: {
          allowed: boolean
          hits: number
          retry_after_secs: number
        }[]
      }
      credit_artist_tip: {
        Args: { _amount_cents: number; _artist_id: string; _source_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dequeue_matchmaking: { Args: never; Returns: boolean }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_matchmaking: { Args: { _tier?: string }; Returns: string }
      get_admin_subscription_metrics: { Args: never; Returns: Json }
      get_artist_earnings_summary: {
        Args: { _artist_id: string }
        Returns: Json
      }
      get_creator_balance_cents: {
        Args: { _user_id: string }
        Returns: {
          available_cents: number
          earned_cents: number
          merch_cents: number
          paid_out_cents: number
          pending_cents: number
          tips_cents: number
        }[]
      }
      get_my_artist_dashboard: { Args: never; Returns: Json }
      get_my_last_seen_at: { Args: never; Returns: string }
      get_my_profile_interests: { Args: never; Returns: string[] }
      get_my_profile_location: { Args: never; Returns: string }
      get_or_create_profile_stream: { Args: never; Returns: string }
      get_revenue_pool_total: { Args: { _month?: string }; Returns: number }
      get_round_vote_totals: {
        Args: { _round_id: string }
        Returns: {
          a_votes: number
          a_weight: number
          b_votes: number
          b_weight: number
        }[]
      }
      get_stream_anomaly_summary: { Args: { _days?: number }; Returns: Json }
      get_stream_tip_totals: {
        Args: { p_stream_id: string }
        Returns: {
          tip_count: number
          total_cents: number
        }[]
      }
      get_total_revenue: {
        Args: { _month?: string }
        Returns: {
          ads_cents: number
          artist_cents: number
          listener_cents: number
          month: string
          tips_cents: number
          total_cents: number
        }[]
      }
      get_user_rank: { Args: { _user_id: string }; Returns: string }
      get_user_xp: { Args: { _user_id: string }; Returns: number }
      get_waitlist_count: { Args: never; Returns: number }
      grant_boost_credits_purchase: {
        Args: {
          _credits: number
          _pack_id: string
          _stripe_session_id: string
          _user_id: string
        }
        Returns: number
      }
      grant_play_boost_credits: {
        Args: { _credits: number; _user_id: string }
        Returns: number
      }
      has_active_artist_access: { Args: { _user_id: string }; Returns: boolean }
      has_active_tunevio_subscription: {
        Args: { _role?: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_track_play_count: {
        Args: { _track_id: string }
        Returns: number
      }
      is_stream_host: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      is_stream_host_or_cohost: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      is_stream_participant: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      log_battle_vote_blocked: {
        Args: { _match_id: string; _metadata?: Json; _reason: string }
        Returns: string
      }
      month_bucket: { Args: { _ts: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      react_to_battle: {
        Args: {
          _action: string
          _artist_id: string
          _battle_id: string
          _ip?: string
          _user_agent?: string
        }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rebuild_artist_vote_stats: { Args: never; Returns: Json }
      recompute_play_arena_rankings: { Args: never; Returns: number }
      record_revenue_event: {
        Args: {
          _amount_cents: number
          _metadata?: Json
          _occurred_at?: string
          _reference_id?: string
          _reference_type?: string
          _source: string
          _user_id?: string
        }
        Returns: string
      }
      record_revenue_ledger: {
        Args: {
          _amount_cents: number
          _metadata?: Json
          _occurred_at?: string
          _source_id: string
          _source_type: string
          _user_id?: string
        }
        Returns: string
      }
      refresh_artist_vote_rollups: {
        Args: { _since?: string }
        Returns: number
      }
      reset_round_votes: { Args: { _round_id: string }; Returns: undefined }
      spend_boost_credit: {
        Args: { _amount?: number; _reason?: string; _reference_id?: string }
        Returns: number
      }
      spend_boost_on_track: {
        Args: { _track_id: string; _weight?: number }
        Returns: {
          new_balance: number
          spend_id: string
        }[]
      }
      split_revenue_pool: {
        Args: { _total_cents: number }
        Returns: {
          artist_pool_cents: number
          incentive_pool_cents: number
          platform_pool_cents: number
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
        | "manager"
      battle_reaction_action: "hype" | "pass"
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
        "manager",
      ],
      battle_reaction_action: ["hype", "pass"],
    },
  },
} as const
