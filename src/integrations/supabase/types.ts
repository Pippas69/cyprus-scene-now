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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      beta_invite_codes: {
        Row: {
          business_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          note: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          business_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          note?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          business_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          note?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_invite_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_invite_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content_el: string
          content_en: string
          created_at: string | null
          excerpt_el: string | null
          excerpt_en: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          title_el: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content_el: string
          content_en: string
          created_at?: string | null
          excerpt_el?: string | null
          excerpt_en?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          title_el: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content_el?: string
          content_en?: string
          created_at?: string | null
          excerpt_el?: string | null
          excerpt_en?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          title_el?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_analytics: {
        Row: {
          boost_id: string
          clicks: number
          created_at: string
          date: string
          event_id: string
          id: string
          impressions: number
          rsvps_going: number
          rsvps_interested: number
          unique_viewers: number
          updated_at: string
        }
        Insert: {
          boost_id: string
          clicks?: number
          created_at?: string
          date?: string
          event_id: string
          id?: string
          impressions?: number
          rsvps_going?: number
          rsvps_interested?: number
          unique_viewers?: number
          updated_at?: string
        }
        Update: {
          boost_id?: string
          clicks?: number
          created_at?: string
          date?: string
          event_id?: string
          id?: string
          impressions?: number
          rsvps_going?: number
          rsvps_interested?: number
          unique_viewers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_analytics_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "event_boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      business_followers: {
        Row: {
          business_id: string
          created_at: string
          id: string
          source: string | null
          unfollowed_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          source?: string | null
          unfollowed_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          source?: string | null
          unfollowed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_followers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_followers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "business_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_post_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_post_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "business_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_post_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_post_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_post_views: {
        Row: {
          id: string
          post_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          post_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "business_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_posts: {
        Row: {
          business_id: string
          content: string | null
          created_at: string
          expires_at: string | null
          hashtags: string[] | null
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          linked_event_id: string | null
          media_urls: string[] | null
          mentions: string[] | null
          poll_ends_at: string | null
          poll_multiple_choice: boolean | null
          poll_options: Json | null
          poll_question: string | null
          post_type: Database["public"]["Enums"]["business_post_type"]
          published_at: string | null
          scheduled_at: string | null
          shares_count: number | null
          updated_at: string
          views_count: number | null
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          business_id: string
          content?: string | null
          created_at?: string
          expires_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          linked_event_id?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          poll_ends_at?: string | null
          poll_multiple_choice?: boolean | null
          poll_options?: Json | null
          poll_question?: string | null
          post_type?: Database["public"]["Enums"]["business_post_type"]
          published_at?: string | null
          scheduled_at?: string | null
          shares_count?: number | null
          updated_at?: string
          views_count?: number | null
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          business_id?: string
          content?: string | null
          created_at?: string
          expires_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          linked_event_id?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          poll_ends_at?: string | null
          poll_multiple_choice?: boolean | null
          poll_options?: Json | null
          poll_question?: string | null
          post_type?: Database["public"]["Enums"]["business_post_type"]
          published_at?: string | null
          scheduled_at?: string | null
          shares_count?: number | null
          updated_at?: string
          views_count?: number | null
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "business_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_posts_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          beta_discount_percent: number | null
          beta_tester: boolean | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          business_id: string
          canceled_at: string | null
          commission_free_offers_remaining: number | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          monthly_budget_remaining_cents: number | null
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          beta_discount_percent?: number | null
          beta_tester?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          business_id: string
          canceled_at?: string | null
          commission_free_offers_remaining?: number | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          monthly_budget_remaining_cents?: number | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          beta_discount_percent?: number | null
          beta_tester?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          business_id?: string
          canceled_at?: string | null
          commission_free_offers_remaining?: number | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          monthly_budget_remaining_cents?: number | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accepts_direct_reservations: boolean | null
          address: string | null
          category: string[]
          city: string
          closes_at: string | null
          cover_url: string | null
          created_at: string
          daily_reservation_limit: number | null
          description: string | null
          free_entry_boost_banned: boolean | null
          free_entry_creation_banned: boolean | null
          free_entry_strikes: number | null
          geo: unknown
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          opens_at: string | null
          phone: string | null
          reservation_capacity_type: string | null
          reservation_closes_at: string | null
          reservation_days: string[] | null
          reservation_opens_at: string | null
          reservation_requires_approval: boolean | null
          reservation_seating_options: string[] | null
          reservation_time_slots: Json | null
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
          student_discount_enabled: boolean | null
          student_discount_mode: string | null
          student_discount_percent: number | null
          updated_at: string
          user_id: string
          verification_notes: string | null
          verified: boolean | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          accepts_direct_reservations?: boolean | null
          address?: string | null
          category: string[]
          city: string
          closes_at?: string | null
          cover_url?: string | null
          created_at?: string
          daily_reservation_limit?: number | null
          description?: string | null
          free_entry_boost_banned?: boolean | null
          free_entry_creation_banned?: boolean | null
          free_entry_strikes?: number | null
          geo?: unknown
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          opens_at?: string | null
          phone?: string | null
          reservation_capacity_type?: string | null
          reservation_closes_at?: string | null
          reservation_days?: string[] | null
          reservation_opens_at?: string | null
          reservation_requires_approval?: boolean | null
          reservation_seating_options?: string[] | null
          reservation_time_slots?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          student_discount_enabled?: boolean | null
          student_discount_mode?: string | null
          student_discount_percent?: number | null
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          accepts_direct_reservations?: boolean | null
          address?: string | null
          category?: string[]
          city?: string
          closes_at?: string | null
          cover_url?: string | null
          created_at?: string
          daily_reservation_limit?: number | null
          description?: string | null
          free_entry_boost_banned?: boolean | null
          free_entry_creation_banned?: boolean | null
          free_entry_strikes?: number | null
          geo?: unknown
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          opens_at?: string | null
          phone?: string | null
          reservation_capacity_type?: string | null
          reservation_closes_at?: string | null
          reservation_days?: string[] | null
          reservation_opens_at?: string | null
          reservation_requires_approval?: boolean | null
          reservation_seating_options?: string[] | null
          reservation_time_slots?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
          student_discount_enabled?: boolean | null
          student_discount_mode?: string | null
          student_discount_percent?: number | null
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          business_id: string
          commission_amount_cents: number
          commission_percent: number
          created_at: string | null
          discount_id: string
          id: string
          invoice_id: string | null
          original_price_cents: number
          redeemed_at: string
          redemption_id: string
          status: Database["public"]["Enums"]["commission_status"] | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          commission_amount_cents: number
          commission_percent: number
          created_at?: string | null
          discount_id: string
          id?: string
          invoice_id?: string | null
          original_price_cents: number
          redeemed_at: string
          redemption_id: string
          status?: Database["public"]["Enums"]["commission_status"] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          commission_amount_cents?: number
          commission_percent?: number
          created_at?: string | null
          discount_id?: string
          id?: string
          invoice_id?: string | null
          original_price_cents?: number
          redeemed_at?: string
          redemption_id?: string
          status?: Database["public"]["Enums"]["commission_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "commission_ledger_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          business_name: string | null
          business_type: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          message: string | null
          phone: string | null
          website: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          message?: string | null
          phone?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string | null
          phone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          balance_before_cents: number
          business_id: string
          created_at: string | null
          id: string
          notes: string | null
          purchase_id: string
          redeemed_by: string | null
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          balance_before_cents: number
          business_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_id: string
          redeemed_by?: string | null
          transaction_type: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          balance_before_cents?: number
          business_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_id?: string
          redeemed_by?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "offer_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_analytics: {
        Row: {
          business_id: string
          created_at: string
          date: string
          discount_redemptions: number
          engagement_rate: number | null
          id: string
          new_followers: number
          new_reservations: number
          new_rsvps_going: number
          new_rsvps_interested: number
          total_discount_views: number
          total_event_views: number
          unfollows: number
          unique_discount_viewers: number
          unique_event_viewers: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          date: string
          discount_redemptions?: number
          engagement_rate?: number | null
          id?: string
          new_followers?: number
          new_reservations?: number
          new_rsvps_going?: number
          new_rsvps_interested?: number
          total_discount_views?: number
          total_event_views?: number
          unfollows?: number
          unique_discount_viewers?: number
          unique_event_viewers?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          date?: string
          discount_redemptions?: number
          engagement_rate?: number | null
          id?: string
          new_followers?: number
          new_reservations?: number
          new_rsvps_going?: number
          new_rsvps_interested?: number
          total_discount_views?: number
          total_event_views?: number
          unfollows?: number
          unique_discount_viewers?: number
          unique_event_viewers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_items: {
        Row: {
          created_at: string
          description: string | null
          discount_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_items_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "discount_items_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_items_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_scans: {
        Row: {
          device_info: Json | null
          discount_id: string
          id: string
          location_info: Json | null
          scan_type: string
          scanned_at: string
          scanned_by: string | null
          success: boolean
        }
        Insert: {
          device_info?: Json | null
          discount_id: string
          id?: string
          location_info?: Json | null
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
          success?: boolean
        }
        Update: {
          device_info?: Json | null
          discount_id?: string
          id?: string
          location_info?: Json | null
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "discount_scans_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "discount_scans_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scans_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_views: {
        Row: {
          created_at: string
          device_type: string | null
          discount_id: string
          id: string
          session_id: string | null
          source: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          discount_id: string
          id?: string
          session_id?: string | null
          source: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          discount_id?: string
          id?: string
          session_id?: string | null
          source?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_views_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "discount_views_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_views_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          active: boolean | null
          bonus_percent: number | null
          bundle_price_cents: number | null
          business_id: string
          category: string | null
          commission_free: boolean
          created_at: string
          credit_amount_cents: number | null
          description: string | null
          discount_type: string | null
          end_at: string
          id: string
          max_people_per_redemption: number | null
          max_per_user: number | null
          max_purchases: number | null
          offer_type: string | null
          one_per_user: boolean | null
          original_price_cents: number | null
          people_remaining: number | null
          percent_off: number | null
          pricing_type: string
          qr_code_token: string
          requires_reservation: boolean | null
          show_reservation_cta: boolean | null
          special_deal_text: string | null
          start_at: string
          terms: string | null
          title: string
          total_people: number | null
          total_purchased: number | null
          valid_days: string[] | null
          valid_end_time: string | null
          valid_start_time: string | null
        }
        Insert: {
          active?: boolean | null
          bonus_percent?: number | null
          bundle_price_cents?: number | null
          business_id: string
          category?: string | null
          commission_free?: boolean
          created_at?: string
          credit_amount_cents?: number | null
          description?: string | null
          discount_type?: string | null
          end_at: string
          id?: string
          max_people_per_redemption?: number | null
          max_per_user?: number | null
          max_purchases?: number | null
          offer_type?: string | null
          one_per_user?: boolean | null
          original_price_cents?: number | null
          people_remaining?: number | null
          percent_off?: number | null
          pricing_type?: string
          qr_code_token: string
          requires_reservation?: boolean | null
          show_reservation_cta?: boolean | null
          special_deal_text?: string | null
          start_at: string
          terms?: string | null
          title: string
          total_people?: number | null
          total_purchased?: number | null
          valid_days?: string[] | null
          valid_end_time?: string | null
          valid_start_time?: string | null
        }
        Update: {
          active?: boolean | null
          bonus_percent?: number | null
          bundle_price_cents?: number | null
          business_id?: string
          category?: string | null
          commission_free?: boolean
          created_at?: string
          credit_amount_cents?: number | null
          description?: string | null
          discount_type?: string | null
          end_at?: string
          id?: string
          max_people_per_redemption?: number | null
          max_per_user?: number | null
          max_purchases?: number | null
          offer_type?: string | null
          one_per_user?: boolean | null
          original_price_cents?: number | null
          people_remaining?: number | null
          percent_off?: number | null
          pricing_type?: string
          qr_code_token?: string
          requires_reservation?: boolean | null
          show_reservation_cta?: boolean | null
          special_deal_text?: string | null
          start_at?: string
          terms?: string | null
          title?: string
          total_people?: number | null
          total_purchased?: number | null
          valid_days?: string[] | null
          valid_end_time?: string | null
          valid_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_events: {
        Row: {
          business_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_boosts: {
        Row: {
          boost_tier: Database["public"]["Enums"]["boost_tier"]
          business_id: string
          created_at: string | null
          daily_rate_cents: number
          duration_hours: number | null
          duration_mode: string | null
          end_date: string
          event_id: string
          hourly_rate_cents: number | null
          id: string
          source: Database["public"]["Enums"]["boost_source"]
          start_date: string
          status: Database["public"]["Enums"]["boost_status"] | null
          stripe_payment_intent_id: string | null
          targeting_quality: number | null
          total_cost_cents: number
          updated_at: string | null
        }
        Insert: {
          boost_tier: Database["public"]["Enums"]["boost_tier"]
          business_id: string
          created_at?: string | null
          daily_rate_cents: number
          duration_hours?: number | null
          duration_mode?: string | null
          end_date: string
          event_id: string
          hourly_rate_cents?: number | null
          id?: string
          source: Database["public"]["Enums"]["boost_source"]
          start_date: string
          status?: Database["public"]["Enums"]["boost_status"] | null
          stripe_payment_intent_id?: string | null
          targeting_quality?: number | null
          total_cost_cents: number
          updated_at?: string | null
        }
        Update: {
          boost_tier?: Database["public"]["Enums"]["boost_tier"]
          business_id?: string
          created_at?: string | null
          daily_rate_cents?: number
          duration_hours?: number | null
          duration_mode?: string | null
          end_date?: string
          event_id?: string
          hourly_rate_cents?: number | null
          id?: string
          source?: Database["public"]["Enums"]["boost_source"]
          start_date?: string
          status?: Database["public"]["Enums"]["boost_status"] | null
          stripe_payment_intent_id?: string | null
          targeting_quality?: number | null
          total_cost_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_boosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_posts: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_views: {
        Row: {
          created_at: string
          device_type: string | null
          event_id: string
          id: string
          session_id: string | null
          source: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_id: string
          id?: string
          session_id?: string | null
          source: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_id?: string
          id?: string
          session_id?: string | null
          source?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_views_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accepts_reservations: boolean | null
          accessibility_info: string[] | null
          appearance_end_at: string | null
          appearance_mode: string | null
          appearance_start_at: string | null
          business_id: string
          category: string[]
          cover_image_url: string | null
          created_at: string
          description: string | null
          dress_code: string | null
          end_at: string
          event_type: string | null
          external_ticket_url: string | null
          free_entry_declaration: boolean | null
          gallery_urls: string[] | null
          id: string
          is_indoor: boolean | null
          location: string
          max_party_size: number | null
          max_reservations: number | null
          max_total_reservations: number | null
          min_age_hint: number | null
          min_party_size: number | null
          parking_info: string | null
          performers: string[] | null
          price: number | null
          price_tier: Database["public"]["Enums"]["price_tier"] | null
          requires_approval: boolean | null
          reservation_hours_from: string | null
          reservation_hours_to: string | null
          seating_options: string[] | null
          start_at: string
          tags: string[] | null
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          accepts_reservations?: boolean | null
          accessibility_info?: string[] | null
          appearance_end_at?: string | null
          appearance_mode?: string | null
          appearance_start_at?: string | null
          business_id: string
          category: string[]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          dress_code?: string | null
          end_at: string
          event_type?: string | null
          external_ticket_url?: string | null
          free_entry_declaration?: boolean | null
          gallery_urls?: string[] | null
          id?: string
          is_indoor?: boolean | null
          location: string
          max_party_size?: number | null
          max_reservations?: number | null
          max_total_reservations?: number | null
          min_age_hint?: number | null
          min_party_size?: number | null
          parking_info?: string | null
          performers?: string[] | null
          price?: number | null
          price_tier?: Database["public"]["Enums"]["price_tier"] | null
          requires_approval?: boolean | null
          reservation_hours_from?: string | null
          reservation_hours_to?: string | null
          seating_options?: string[] | null
          start_at: string
          tags?: string[] | null
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          accepts_reservations?: boolean | null
          accessibility_info?: string[] | null
          appearance_end_at?: string | null
          appearance_mode?: string | null
          appearance_start_at?: string | null
          business_id?: string
          category?: string[]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          dress_code?: string | null
          end_at?: string
          event_type?: string | null
          external_ticket_url?: string | null
          free_entry_declaration?: boolean | null
          gallery_urls?: string[] | null
          id?: string
          is_indoor?: boolean | null
          location?: string
          max_party_size?: number | null
          max_reservations?: number | null
          max_total_reservations?: number | null
          min_age_hint?: number | null
          min_party_size?: number | null
          parking_info?: string | null
          performers?: string[] | null
          price?: number | null
          price_tier?: Database["public"]["Enums"]["price_tier"] | null
          requires_approval?: boolean | null
          reservation_hours_from?: string | null
          reservation_hours_to?: string | null
          seating_options?: string[] | null
          start_at?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_discounts: {
        Row: {
          created_at: string
          discount_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_discounts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "favorite_discounts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_discounts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_discounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_discounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
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
            foreignKeyName: "favorites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured: {
        Row: {
          created_at: string
          end_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          start_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          end_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          start_at: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          end_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          start_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      featured_content: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          entity_id: string
          entity_type: string
          id: string
          start_date: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          entity_id: string
          entity_type: string
          id?: string
          start_date: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          entity_id?: string
          entity_type?: string
          id?: string
          start_date?: string
          weight?: number | null
        }
        Relationships: []
      }
      free_entry_reports: {
        Row: {
          created_at: string | null
          details: string | null
          event_id: string
          id: string
          report_reason: string
          reporter_user_id: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          event_id: string
          id?: string
          report_reason: string
          reporter_user_id: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          event_id?: string
          id?: string
          report_reason?: string
          reporter_user_id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "free_entry_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_entry_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_entry_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_entry_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_entry_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          details: Json | null
          id: string
          message: string
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message: string
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string
          severity?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_boosts: {
        Row: {
          active: boolean | null
          boost_tier: string | null
          business_id: string
          commission_percent: number
          created_at: string | null
          daily_rate_cents: number | null
          discount_id: string
          duration_hours: number | null
          duration_mode: string | null
          end_date: string | null
          hourly_rate_cents: number | null
          id: string
          source: string | null
          start_date: string | null
          status: string | null
          targeting_quality: number
          total_cost_cents: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          boost_tier?: string | null
          business_id: string
          commission_percent: number
          created_at?: string | null
          daily_rate_cents?: number | null
          discount_id: string
          duration_hours?: number | null
          duration_mode?: string | null
          end_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          source?: string | null
          start_date?: string | null
          status?: string | null
          targeting_quality: number
          total_cost_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          boost_tier?: string | null
          business_id?: string
          commission_percent?: number
          created_at?: string | null
          daily_rate_cents?: number | null
          discount_id?: string
          duration_hours?: number | null
          duration_mode?: string | null
          end_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          source?: string | null
          start_date?: string | null
          status?: string | null
          targeting_quality?: number
          total_cost_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_boosts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: true
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "offer_boosts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: true
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_boosts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: true
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_purchases: {
        Row: {
          amount_paid_cents: number | null
          balance_remaining_cents: number | null
          business_id: string
          business_payout_cents: number
          claim_type: string | null
          commission_amount_cents: number
          commission_percent: number
          created_at: string | null
          discount_id: string
          discount_percent: number
          expires_at: string
          final_price_cents: number
          id: string
          original_price_cents: number
          party_size: number | null
          payment_link_expires_at: string | null
          payment_link_url: string | null
          qr_code_token: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          reservation_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid_cents?: number | null
          balance_remaining_cents?: number | null
          business_id: string
          business_payout_cents: number
          claim_type?: string | null
          commission_amount_cents?: number
          commission_percent?: number
          created_at?: string | null
          discount_id: string
          discount_percent: number
          expires_at: string
          final_price_cents: number
          id?: string
          original_price_cents: number
          party_size?: number | null
          payment_link_expires_at?: string | null
          payment_link_url?: string | null
          qr_code_token?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          reservation_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid_cents?: number | null
          balance_remaining_cents?: number | null
          business_id?: string
          business_payout_cents?: number
          claim_type?: string | null
          commission_amount_cents?: number
          commission_percent?: number
          created_at?: string | null
          discount_id?: string
          discount_percent?: number
          expires_at?: string
          final_price_cents?: number
          id?: string
          original_price_cents?: number
          party_size?: number | null
          payment_link_expires_at?: string | null
          payment_link_url?: string | null
          qr_code_token?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          reservation_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_purchases_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "offer_purchases_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_purchases_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_purchases_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_invoices: {
        Row: {
          boost_total_cents: number | null
          business_id: string
          commission_total_cents: number | null
          created_at: string | null
          due_date: string | null
          id: string
          paid_at: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id: string | null
          subscription_total_cents: number | null
          total_amount_cents: number
          updated_at: string | null
        }
        Insert: {
          boost_total_cents?: number | null
          business_id: string
          commission_total_cents?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id?: string | null
          subscription_total_cents?: number | null
          total_amount_cents: number
          updated_at?: string | null
        }
        Update: {
          boost_total_cents?: number | null
          business_id?: string
          commission_total_cents?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          stripe_invoice_id?: string | null
          subscription_total_cents?: number | null
          total_amount_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "event_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          business_id: string
          created_at: string
          id: string
          image_url: string | null
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          id?: string
          image_url?: string | null
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_boosts: {
        Row: {
          boost_tier: Database["public"]["Enums"]["boost_tier"]
          business_id: string
          created_at: string | null
          daily_rate_cents: number
          duration_hours: number | null
          duration_mode: string | null
          end_date: string
          hourly_rate_cents: number | null
          id: string
          source: Database["public"]["Enums"]["boost_source"]
          start_date: string
          status: Database["public"]["Enums"]["boost_status"] | null
          stripe_payment_intent_id: string | null
          targeting_quality: number | null
          total_cost_cents: number
          updated_at: string | null
        }
        Insert: {
          boost_tier: Database["public"]["Enums"]["boost_tier"]
          business_id: string
          created_at?: string | null
          daily_rate_cents: number
          duration_hours?: number | null
          duration_mode?: string | null
          end_date: string
          hourly_rate_cents?: number | null
          id?: string
          source: Database["public"]["Enums"]["boost_source"]
          start_date: string
          status?: Database["public"]["Enums"]["boost_status"] | null
          stripe_payment_intent_id?: string | null
          targeting_quality?: number | null
          total_cost_cents: number
          updated_at?: string | null
        }
        Update: {
          boost_tier?: Database["public"]["Enums"]["boost_tier"]
          business_id?: string
          created_at?: string | null
          daily_rate_cents?: number
          duration_hours?: number | null
          duration_mode?: string | null
          end_date?: string
          hourly_rate_cents?: number | null
          id?: string
          source?: Database["public"]["Enums"]["boost_source"]
          start_date?: string
          status?: Database["public"]["Enums"]["boost_status"] | null
          stripe_payment_intent_id?: string | null
          targeting_quality?: number | null
          total_cost_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          created_at: string
          dob_month: number | null
          dob_year: number | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          interests: string[] | null
          is_admin: boolean | null
          is_student_verified: boolean | null
          is_waitlist: boolean | null
          last_name: string | null
          name: string | null
          preferences: string[] | null
          role: Database["public"]["Enums"]["app_role"]
          student_qr_token: string | null
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          town: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          dob_month?: number | null
          dob_year?: number | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          is_admin?: boolean | null
          is_student_verified?: boolean | null
          is_waitlist?: boolean | null
          last_name?: string | null
          name?: string | null
          preferences?: string[] | null
          role?: Database["public"]["Enums"]["app_role"]
          student_qr_token?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          town?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          dob_month?: number | null
          dob_year?: number | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_admin?: boolean | null
          is_student_verified?: boolean | null
          is_waitlist?: boolean | null
          last_name?: string | null
          name?: string | null
          preferences?: string[] | null
          role?: Database["public"]["Enums"]["app_role"]
          student_qr_token?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          town?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      realtime_stats: {
        Row: {
          age_bucket_15_17: number | null
          age_bucket_18_24: number | null
          age_bucket_25_34: number | null
          age_bucket_35_44: number | null
          age_bucket_45_60: number | null
          event_id: string
          going_count: number | null
          interested_count: number | null
          updated_at: string
        }
        Insert: {
          age_bucket_15_17?: number | null
          age_bucket_18_24?: number | null
          age_bucket_25_34?: number | null
          age_bucket_35_44?: number | null
          age_bucket_45_60?: number | null
          event_id: string
          going_count?: number | null
          interested_count?: number | null
          updated_at?: string
        }
        Update: {
          age_bucket_15_17?: number | null
          age_bucket_18_24?: number | null
          age_bucket_25_34?: number | null
          age_bucket_35_44?: number | null
          age_bucket_45_60?: number | null
          event_id?: string
          going_count?: number | null
          interested_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "realtime_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          discount_id: string
          id: string
          redeemed_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          discount_id: string
          id?: string
          redeemed_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          discount_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_scan_stats"
            referencedColumns: ["discount_id"]
          },
          {
            foreignKeyName: "redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "public_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          reason: string
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          reason: string
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          reason?: string
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_scans: {
        Row: {
          device_info: Json | null
          id: string
          reservation_id: string
          scan_type: string
          scanned_at: string
          scanned_by: string | null
          success: boolean
        }
        Insert: {
          device_info?: Json | null
          id?: string
          reservation_id: string
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
          success?: boolean
        }
        Update: {
          device_info?: Json | null
          id?: string
          reservation_id?: string
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reservation_scans_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_seating_types: {
        Row: {
          available_slots: number
          cancellation_policy: string | null
          created_at: string | null
          dress_code: string | null
          event_id: string
          id: string
          no_show_policy: string | null
          seating_type: string
          slots_booked: number
          updated_at: string | null
        }
        Insert: {
          available_slots?: number
          cancellation_policy?: string | null
          created_at?: string | null
          dress_code?: string | null
          event_id: string
          id?: string
          no_show_policy?: string | null
          seating_type: string
          slots_booked?: number
          updated_at?: string | null
        }
        Update: {
          available_slots?: number
          cancellation_policy?: string | null
          created_at?: string | null
          dress_code?: string | null
          event_id?: string
          id?: string
          no_show_policy?: string | null
          seating_type?: string
          slots_booked?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_seating_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          business_id: string | null
          business_notes: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_code: string | null
          created_at: string
          event_id: string | null
          id: string
          party_size: number
          phone_number: string | null
          preferred_time: string | null
          prepaid_charge_status: string | null
          prepaid_min_charge_cents: number | null
          qr_code_token: string | null
          reservation_name: string
          seating_preference: string | null
          seating_type_id: string | null
          special_requests: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          business_notes?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          confirmation_code?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          party_size: number
          phone_number?: string | null
          preferred_time?: string | null
          prepaid_charge_status?: string | null
          prepaid_min_charge_cents?: number | null
          qr_code_token?: string | null
          reservation_name: string
          seating_preference?: string | null
          seating_type_id?: string | null
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          business_notes?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          confirmation_code?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          party_size?: number
          phone_number?: string | null
          preferred_time?: string | null
          prepaid_charge_status?: string | null
          prepaid_min_charge_cents?: number | null
          qr_code_token?: string | null
          reservation_name?: string
          seating_preference?: string | null
          seating_type_id?: string | null
          special_requests?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_seating_type_id_fkey"
            columns: ["seating_type_id"]
            isOneToOne: false
            referencedRelation: "reservation_seating_types"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_type_tiers: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          max_people: number
          min_people: number
          prepaid_min_charge_cents: number
          seating_type_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          max_people: number
          min_people: number
          prepaid_min_charge_cents: number
          seating_type_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          max_people?: number
          min_people?: number
          prepaid_min_charge_cents?: number
          seating_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_type_tiers_seating_type_id_fkey"
            columns: ["seating_type_id"]
            isOneToOne: false
            referencedRelation: "reservation_seating_types"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      student_discount_partners: {
        Row: {
          business_id: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          joined_at: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          joined_at?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          joined_at?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_discount_partners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_discount_partners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_discount_redemptions: {
        Row: {
          business_id: string
          created_at: string
          discount_amount_cents: number
          discounted_price_cents: number
          id: string
          item_description: string | null
          original_price_cents: number
          scanned_by: string | null
          student_verification_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          discount_amount_cents: number
          discounted_price_cents: number
          id?: string
          item_description?: string | null
          original_price_cents: number
          scanned_by?: string | null
          student_verification_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          discount_amount_cents?: number
          discounted_price_cents?: number
          id?: string
          item_description?: string | null
          original_price_cents?: number
          scanned_by?: string | null
          student_verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_discount_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_discount_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_discount_redemptions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_discount_redemptions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_discount_redemptions_student_verification_id_fkey"
            columns: ["student_verification_id"]
            isOneToOne: false
            referencedRelation: "student_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      student_redemptions: {
        Row: {
          business_id: string
          created_at: string
          id: string
          notes: string | null
          redeemed_at: string
          scanned_by: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          scanned_by?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          scanned_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_redemptions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_redemptions_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subsidy_invoices: {
        Row: {
          business_id: string
          created_at: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          total_redemptions: number
          total_subsidy_cents: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          total_redemptions?: number
          total_subsidy_cents?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_redemptions?: number
          total_subsidy_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subsidy_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subsidy_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          qr_code_token: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token_expires_at: string | null
          university_domain: string
          university_email: string
          university_name: string
          updated_at: string
          user_id: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          qr_code_token?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_expires_at?: string | null
          university_domain: string
          university_email: string
          university_name: string
          updated_at?: string
          user_id: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          qr_code_token?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_expires_at?: string | null
          university_domain?: string
          university_email?: string
          university_name?: string
          updated_at?: string
          user_id?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          commission_free_offers_count: number
          created_at: string | null
          display_order: number | null
          event_boost_budget_cents: number
          features: Json | null
          id: string
          name: string
          price_annual_cents: number
          price_monthly_cents: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          commission_free_offers_count: number
          created_at?: string | null
          display_order?: number | null
          event_boost_budget_cents: number
          features?: Json | null
          id?: string
          name: string
          price_annual_cents: number
          price_monthly_cents: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          commission_free_offers_count?: number
          created_at?: string | null
          display_order?: number | null
          event_boost_budget_cents?: number
          features?: Json | null
          id?: string
          name?: string
          price_annual_cents?: number
          price_monthly_cents?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_commission_rates: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          plan_slug: string
        }
        Insert: {
          commission_percent: number
          created_at?: string
          id?: string
          plan_slug: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          plan_slug?: string
        }
        Relationships: []
      }
      ticket_orders: {
        Row: {
          business_id: string
          commission_cents: number
          commission_percent: number
          created_at: string
          customer_email: string
          customer_name: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["ticket_order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          commission_cents?: number
          commission_percent?: number
          created_at?: string
          customer_email: string
          customer_name: string
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          commission_cents?: number
          commission_percent?: number
          created_at?: string
          customer_email?: string
          customer_name?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          dress_code: string | null
          event_id: string
          id: string
          max_per_order: number
          name: string
          price_cents: number
          quantity_sold: number
          quantity_total: number
          sale_end_at: string | null
          sale_start_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          dress_code?: string | null
          event_id: string
          id?: string
          max_per_order?: number
          name: string
          price_cents?: number
          quantity_sold?: number
          quantity_total: number
          sale_end_at?: string | null
          sale_start_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          dress_code?: string | null
          event_id?: string
          id?: string
          max_per_order?: number
          name?: string
          price_cents?: number
          quantity_sold?: number
          quantity_total?: number
          sale_end_at?: string | null
          sale_start_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          order_id: string
          qr_code_token: string
          status: Database["public"]["Enums"]["ticket_status"]
          tier_id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          qr_code_token?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tier_id: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          qr_code_token?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ticket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          default_city: string | null
          email_notifications_enabled: boolean | null
          feed_view_mode: string | null
          id: string
          notification_business_updates: boolean | null
          notification_daily_sales_summary: boolean | null
          notification_event_reminders: boolean | null
          notification_new_events: boolean | null
          notification_push_enabled: boolean | null
          notification_reservations: boolean | null
          notification_rsvp_updates: boolean | null
          notification_ticket_sales: boolean | null
          profile_visibility: string | null
          theme_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_city?: string | null
          email_notifications_enabled?: boolean | null
          feed_view_mode?: string | null
          id?: string
          notification_business_updates?: boolean | null
          notification_daily_sales_summary?: boolean | null
          notification_event_reminders?: boolean | null
          notification_new_events?: boolean | null
          notification_push_enabled?: boolean | null
          notification_reservations?: boolean | null
          notification_rsvp_updates?: boolean | null
          notification_ticket_sales?: boolean | null
          profile_visibility?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_city?: string | null
          email_notifications_enabled?: boolean | null
          feed_view_mode?: string | null
          id?: string
          notification_business_updates?: boolean | null
          notification_daily_sales_summary?: boolean | null
          notification_event_reminders?: boolean | null
          notification_new_events?: boolean | null
          notification_push_enabled?: boolean | null
          notification_reservations?: boolean | null
          notification_rsvp_updates?: boolean | null
          notification_ticket_sales?: boolean | null
          profile_visibility?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id?: string
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
      connection_stats_monitor: {
        Row: {
          checked_at: string | null
          connection_count: number | null
          state: string | null
        }
        Relationships: []
      }
      discount_scan_stats: {
        Row: {
          business_id: string | null
          discount_id: string | null
          last_scanned_at: string | null
          scans_last_24h: number | null
          scans_last_7d: number | null
          title: string | null
          total_redemptions: number | null
          total_scans: number | null
          total_verifications: number | null
          total_views: number | null
          unique_scanners: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvp_counts: {
        Row: {
          event_id: string | null
          going_count: number | null
          interested_count: number | null
          total_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_businesses: {
        Row: {
          address: string | null
          category: string[] | null
          city: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          geo: unknown
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string[] | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          geo?: unknown
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string[] | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          geo?: unknown
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      public_discounts: {
        Row: {
          active: boolean | null
          business_id: string | null
          created_at: string | null
          description: string | null
          end_at: string | null
          id: string | null
          percent_off: number | null
          start_at: string | null
          terms: string | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string | null
          percent_off?: number | null
          start_at?: string | null
          terms?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string | null
          percent_off?: number | null
          start_at?: string | null
          terms?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "public_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          interests: string[] | null
          last_name: string | null
          name: string | null
          town: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          interests?: string[] | null
          last_name?: string | null
          name?: string | null
          town?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          interests?: string[] | null
          last_name?: string | null
          name?: string | null
          town?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_set_user_suspension: {
        Args: { is_suspended: boolean; reason?: string; target_user_id: string }
        Returns: boolean
      }
      calculate_user_similarity: {
        Args: { user1_id: string; user2_id: string }
        Returns: number
      }
      create_business_with_geo: {
        Args: {
          p_address: string
          p_category: string[]
          p_city: string
          p_description: string
          p_latitude: number
          p_logo_url: string
          p_longitude: number
          p_name: string
          p_phone: string
          p_user_id: string
          p_website: string
        }
        Returns: string
      }
      create_preferences_for_existing_users: { Args: never; Returns: undefined }
      decrement_seating_slots: {
        Args: { p_seating_type_id: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_confirmation_code: { Args: never; Returns: string }
      generate_qr_token: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_available_capacity: { Args: { p_event_id: string }; Returns: number }
      get_business_analytics: {
        Args: {
          p_business_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_business_available_capacity: {
        Args: { p_business_id: string; p_date: string }
        Returns: Json
      }
      get_business_coordinates: {
        Args: { business_ids: string[] }
        Returns: {
          business_id: string
          latitude: number
          longitude: number
        }[]
      }
      get_business_follower_count: {
        Args: { business_id_param: string }
        Returns: number
      }
      get_discount_qr_token: { Args: { discount_id: string }; Returns: string }
      get_event_attendees_with_similarity: {
        Args: { current_user_id: string; event_id_param: string }
        Returns: {
          avatar_url: string
          city: string
          connection_status: string
          interests: string[]
          name: string
          rsvp_status: string
          similarity_score: number
          user_id: string
        }[]
      }
      get_event_seating_availability: {
        Args: { p_event_id: string }
        Returns: {
          available_slots: number
          dress_code: string
          min_price_cents: number
          remaining_slots: number
          seating_type: string
          seating_type_id: string
          slots_booked: number
        }[]
      }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_seating_price_for_party: {
        Args: { p_party_size: number; p_seating_type_id: string }
        Returns: number
      }
      get_similar_users: {
        Args: { limit_count?: number; target_user_id: string }
        Returns: {
          avatar_url: string
          city: string
          connection_status: string
          interests: string[]
          name: string
          similarity_score: number
          user_id: string
        }[]
      }
      get_unread_message_count: { Args: never; Returns: number }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mask_phone: { Args: { phone_number: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      search_content: {
        Args: { search_query: string }
        Returns: {
          business_name: string
          category: string[]
          city: string
          cover_image_url: string
          id: string
          location: string
          logo_url: string
          name: string
          relevance_score: number
          result_type: string
          start_at: string
          title: string
          verified: boolean
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_boost_status: { Args: never; Returns: undefined }
      update_business_with_geo: {
        Args: {
          p_address: string
          p_business_id: string
          p_category: string[]
          p_city: string
          p_cover_url: string
          p_description: string
          p_latitude: number
          p_logo_url: string
          p_longitude: number
          p_name: string
          p_phone: string
          p_website: string
        }
        Returns: undefined
      }
      update_daily_analytics: { Args: never; Returns: undefined }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_reservation_with_business: {
        Args: { business_id: string }
        Returns: boolean
      }
      validate_invite_code: {
        Args: { p_code: string }
        Returns: {
          code_id: string
          error_message: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "user" | "business" | "admin"
      billing_cycle: "monthly" | "annual"
      boost_source: "subscription" | "purchase"
      boost_status:
        | "scheduled"
        | "active"
        | "completed"
        | "canceled"
        | "pending"
      boost_tier: "basic" | "standard" | "premium" | "elite"
      business_post_type:
        | "announcement"
        | "photo"
        | "video"
        | "poll"
        | "behind_the_scenes"
        | "story"
      commission_status: "pending" | "invoiced" | "paid" | "disputed"
      entity_type: "event" | "business" | "discount"
      invoice_status: "draft" | "pending" | "paid" | "overdue" | "canceled"
      post_visibility: "public" | "followers" | "private"
      price_tier: "free" | "low" | "medium" | "high"
      rsvp_status: "interested" | "going"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "paused"
      ticket_order_status: "pending" | "completed" | "refunded" | "cancelled"
      ticket_status: "valid" | "used" | "cancelled" | "refunded"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      app_role: ["user", "business", "admin"],
      billing_cycle: ["monthly", "annual"],
      boost_source: ["subscription", "purchase"],
      boost_status: ["scheduled", "active", "completed", "canceled", "pending"],
      boost_tier: ["basic", "standard", "premium", "elite"],
      business_post_type: [
        "announcement",
        "photo",
        "video",
        "poll",
        "behind_the_scenes",
        "story",
      ],
      commission_status: ["pending", "invoiced", "paid", "disputed"],
      entity_type: ["event", "business", "discount"],
      invoice_status: ["draft", "pending", "paid", "overdue", "canceled"],
      post_visibility: ["public", "followers", "private"],
      price_tier: ["free", "low", "medium", "high"],
      rsvp_status: ["interested", "going"],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "paused",
      ],
      ticket_order_status: ["pending", "completed", "refunded", "cancelled"],
      ticket_status: ["valid", "used", "cancelled", "refunded"],
    },
  },
} as const
