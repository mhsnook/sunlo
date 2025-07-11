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
      friend_request_action: {
        Row: {
          action_type:
            | Database["public"]["Enums"]["friend_request_response"]
            | null
          created_at: string
          id: string
          uid_by: string
          uid_for: string
          uid_less: string | null
          uid_more: string | null
        }
        Insert: {
          action_type?:
            | Database["public"]["Enums"]["friend_request_response"]
            | null
          created_at?: string
          id?: string
          uid_by: string
          uid_for: string
          uid_less?: string | null
          uid_more?: string | null
        }
        Update: {
          action_type?:
            | Database["public"]["Enums"]["friend_request_response"]
            | null
          created_at?: string
          id?: string
          uid_by?: string
          uid_for?: string
          uid_less?: string | null
          uid_more?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_request_action_uid_by_fkey"
            columns: ["uid_by"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_by_fkey"
            columns: ["uid_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_for_fkey"
            columns: ["uid_for"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_for_fkey"
            columns: ["uid_for"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_less_fkey"
            columns: ["uid_less"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_less_fkey"
            columns: ["uid_less"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_more_fkey"
            columns: ["uid_more"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_more_fkey"
            columns: ["uid_more"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
      language: {
        Row: {
          alias_of: string | null
          lang: string
          name: string
        }
        Insert: {
          alias_of?: string | null
          lang: string
          name: string
        }
        Update: {
          alias_of?: string | null
          lang?: string
          name?: string
        }
        Relationships: []
      }
      phrase: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          lang: string
          text: string
          text_script: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          lang: string
          text: string
          text_script?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          lang?: string
          text?: string
          text_script?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrase_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "phrase_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "phrase_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "phrase_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
        ]
      }
      phrase_relation: {
        Row: {
          added_by: string | null
          from_phrase_id: string | null
          id: string
          to_phrase_id: string | null
        }
        Insert: {
          added_by?: string | null
          from_phrase_id?: string | null
          id?: string
          to_phrase_id?: string | null
        }
        Update: {
          added_by?: string | null
          from_phrase_id?: string | null
          id?: string
          to_phrase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrase_see_also_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "phrase_see_also_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "phrase_see_also_from_phrase_id_fkey"
            columns: ["from_phrase_id"]
            isOneToOne: false
            referencedRelation: "meta_phrase_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_see_also_from_phrase_id_fkey"
            columns: ["from_phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_see_also_to_phrase_id_fkey"
            columns: ["to_phrase_id"]
            isOneToOne: false
            referencedRelation: "meta_phrase_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_see_also_to_phrase_id_fkey"
            columns: ["to_phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase"
            referencedColumns: ["id"]
          },
        ]
      }
      phrase_translation: {
        Row: {
          added_by: string | null
          id: string
          lang: string
          literal: string | null
          phrase_id: string
          text: string
          text_script: string | null
        }
        Insert: {
          added_by?: string | null
          id?: string
          lang: string
          literal?: string | null
          phrase_id: string
          text: string
          text_script?: string | null
        }
        Update: {
          added_by?: string | null
          id?: string
          lang?: string
          literal?: string | null
          phrase_id?: string
          text?: string
          text_script?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrase_translation_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "phrase_translation_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "phrase_translation_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "phrase_translation_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "phrase_translation_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "meta_phrase_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_translation_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase"
            referencedColumns: ["id"]
          },
        ]
      }
      user_card: {
        Row: {
          created_at: string | null
          id: string
          lang: string
          phrase_id: string
          status: Database["public"]["Enums"]["card_status"] | null
          uid: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lang: string
          phrase_id: string
          status?: Database["public"]["Enums"]["card_status"] | null
          uid?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lang?: string
          phrase_id?: string
          status?: Database["public"]["Enums"]["card_status"] | null
          uid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_card_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_card_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_card_lang_uid_fkey"
            columns: ["uid", "lang"]
            isOneToOne: false
            referencedRelation: "user_deck"
            referencedColumns: ["uid", "lang"]
          },
          {
            foreignKeyName: "user_card_lang_uid_fkey"
            columns: ["uid", "lang"]
            isOneToOne: false
            referencedRelation: "user_deck_plus"
            referencedColumns: ["uid", "lang"]
          },
          {
            foreignKeyName: "user_card_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "meta_phrase_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_card_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
      user_card_review: {
        Row: {
          created_at: string
          day_first_review: boolean
          day_session: string
          difficulty: number | null
          id: string
          lang: string
          phrase_id: string
          review_time_retrievability: number | null
          score: number
          stability: number | null
          uid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_first_review?: boolean
          day_session: string
          difficulty?: number | null
          id?: string
          lang: string
          phrase_id: string
          review_time_retrievability?: number | null
          score: number
          stability?: number | null
          uid?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_first_review?: boolean
          day_session?: string
          difficulty?: number | null
          id?: string
          lang?: string
          phrase_id?: string
          review_time_retrievability?: number | null
          score?: number
          stability?: number | null
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_review_lang_uid_fkey"
            columns: ["uid", "lang"]
            isOneToOne: false
            referencedRelation: "user_deck"
            referencedColumns: ["uid", "lang"]
          },
          {
            foreignKeyName: "user_card_review_lang_uid_fkey"
            columns: ["uid", "lang"]
            isOneToOne: false
            referencedRelation: "user_deck_plus"
            referencedColumns: ["uid", "lang"]
          },
          {
            foreignKeyName: "user_card_review_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "meta_phrase_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_review_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_review_phrase_id_uid_fkey"
            columns: ["uid", "phrase_id"]
            isOneToOne: false
            referencedRelation: "user_card"
            referencedColumns: ["uid", "phrase_id"]
          },
          {
            foreignKeyName: "user_card_review_phrase_id_uid_fkey"
            columns: ["uid", "phrase_id"]
            isOneToOne: false
            referencedRelation: "user_card_plus"
            referencedColumns: ["uid", "phrase_id"]
          },
          {
            foreignKeyName: "user_card_review_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_card_review_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_card_review_uid_lang_day_session_fkey"
            columns: ["uid", "lang", "day_session"]
            isOneToOne: false
            referencedRelation: "user_deck_review_state"
            referencedColumns: ["uid", "lang", "day_session"]
          },
        ]
      }
      user_client_event: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string | null
          uid: string | null
          url: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          uid?: string | null
          url?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string | null
          uid?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_client_event_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_client_event_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
      user_deck: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          lang: string
          learning_goal: Database["public"]["Enums"]["learning_goal"]
          uid: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          lang: string
          learning_goal?: Database["public"]["Enums"]["learning_goal"]
          uid?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          lang?: string
          learning_goal?: Database["public"]["Enums"]["learning_goal"]
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_deck_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_deck_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_deck_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_deck_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
      user_deck_review_state: {
        Row: {
          created_at: string
          day_session: string
          lang: string
          manifest: Json | null
          uid: string
        }
        Insert: {
          created_at?: string
          day_session: string
          lang: string
          manifest?: Json | null
          uid?: string
        }
        Update: {
          created_at?: string
          day_session?: string
          lang?: string
          manifest?: Json | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_deck_review_state_lang_uid_fkey"
            columns: ["lang", "uid"]
            isOneToOne: false
            referencedRelation: "user_deck"
            referencedColumns: ["lang", "uid"]
          },
          {
            foreignKeyName: "user_deck_review_state_lang_uid_fkey"
            columns: ["lang", "uid"]
            isOneToOne: false
            referencedRelation: "user_deck_plus"
            referencedColumns: ["lang", "uid"]
          },
        ]
      }
      user_profile: {
        Row: {
          avatar_path: string | null
          created_at: string
          language_primary: string
          languages_spoken: string[]
          uid: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          language_primary?: string
          languages_spoken?: string[]
          uid?: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          language_primary?: string
          languages_spoken?: string[]
          uid?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      friend_summary: {
        Row: {
          most_recent_action_type:
            | Database["public"]["Enums"]["friend_request_response"]
            | null
          most_recent_created_at: string | null
          most_recent_uid_by: string | null
          most_recent_uid_for: string | null
          status: string | null
          uid_less: string | null
          uid_more: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_request_action_uid_by_fkey"
            columns: ["most_recent_uid_by"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_by_fkey"
            columns: ["most_recent_uid_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_for_fkey"
            columns: ["most_recent_uid_for"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_for_fkey"
            columns: ["most_recent_uid_for"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_less_fkey"
            columns: ["uid_less"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_less_fkey"
            columns: ["uid_less"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_more_fkey"
            columns: ["uid_more"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friend_request_action_uid_more_fkey"
            columns: ["uid_more"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
      language_plus: {
        Row: {
          alias_of: string | null
          display_order: number | null
          lang: string | null
          learners: number | null
          name: string | null
          phrases_to_learn: number | null
          rank: number | null
        }
        Relationships: []
      }
      meta_phrase_info: {
        Row: {
          avg_difficulty: number | null
          avg_stability: number | null
          count_active: number | null
          count_cards: number | null
          count_learned: number | null
          count_skipped: number | null
          created_at: string | null
          id: string | null
          lang: string | null
          percent_active: number | null
          percent_learned: number | null
          percent_skipped: number | null
          rank_least_difficult: number | null
          rank_least_skipped: number | null
          rank_most_learned: number | null
          rank_most_stable: number | null
          rank_newest: number | null
          text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrase_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "phrase_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
        ]
      }
      public_profile: {
        Row: {
          avatar_path: string | null
          uid: string | null
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          uid?: string | null
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          uid?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_card_plus: {
        Row: {
          created_at: string | null
          current_timestamp: string | null
          difficulty: number | null
          id: string | null
          lang: string | null
          last_reviewed_at: string | null
          phrase_id: string | null
          retrievability_now: number | null
          stability: number | null
          status: Database["public"]["Enums"]["card_status"] | null
          uid: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_card_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_card_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_card_lang_uid_fkey"
            columns: ["uid", "lang"]
            isOneToOne: false
            referencedRelation: "user_deck"
            referencedColumns: ["uid", "lang"]
          },
          {
            foreignKeyName: "user_card_lang_uid_fkey"
            columns: ["uid", "lang"]
            isOneToOne: false
            referencedRelation: "user_deck_plus"
            referencedColumns: ["uid", "lang"]
          },
          {
            foreignKeyName: "user_card_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "meta_phrase_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_card_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
      user_deck_plus: {
        Row: {
          archived: boolean | null
          cards_active: number | null
          cards_learned: number | null
          cards_skipped: number | null
          count_reviews_7d: number | null
          count_reviews_7d_positive: number | null
          created_at: string | null
          lang: string | null
          lang_total_phrases: number | null
          language: string | null
          learning_goal: Database["public"]["Enums"]["learning_goal"] | null
          most_recent_review_at: string | null
          uid: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_deck_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_deck_lang_fkey"
            columns: ["lang"]
            isOneToOne: false
            referencedRelation: "language_plus"
            referencedColumns: ["lang"]
          },
          {
            foreignKeyName: "user_deck_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "public_profile"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_deck_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["uid"]
          },
        ]
      }
    }
    Functions: {
      add_phrase_translation_card: {
        Args: {
          phrase_text: string
          phrase_lang: string
          translation_text: string
          translation_lang: string
          phrase_text_script?: string
          translation_text_script?: string
        }
        Returns: string
      }
      fsrs_clamp_d: {
        Args: { difficulty: number }
        Returns: number
      }
      fsrs_d_0: {
        Args: { score: number }
        Returns: number
      }
      fsrs_days_between: {
        Args: { date_before: string; date_after: string }
        Returns: number
      }
      fsrs_delta_d: {
        Args: { score: number }
        Returns: number
      }
      fsrs_difficulty: {
        Args: { difficulty: number; score: number }
        Returns: number
      }
      fsrs_dp: {
        Args: { difficulty: number; score: number }
        Returns: number
      }
      fsrs_interval: {
        Args: { desired_retrievability: number; stability: number }
        Returns: number
      }
      fsrs_retrievability: {
        Args: { time_in_days: number; stability: number }
        Returns: number
      }
      fsrs_s_0: {
        Args: { score: number }
        Returns: number
      }
      fsrs_s_fail: {
        Args: {
          difficulty: number
          stability: number
          review_time_retrievability: number
        }
        Returns: number
      }
      fsrs_s_success: {
        Args: {
          difficulty: number
          stability: number
          review_time_retrievability: number
          score: number
        }
        Returns: number
      }
      fsrs_stability: {
        Args: {
          difficulty: number
          stability: number
          review_time_retrievability: number
          score: number
        }
        Returns: number
      }
      insert_user_card_review: {
        Args: {
          phrase_id: string
          lang: string
          score: number
          day_session: string
          desired_retention?: number
        }
        Returns: {
          created_at: string
          day_first_review: boolean
          day_session: string
          difficulty: number | null
          id: string
          lang: string
          phrase_id: string
          review_time_retrievability: number | null
          score: number
          stability: number | null
          uid: string
          updated_at: string
        }
      }
      update_user_card_review: {
        Args: { review_id: string; score: number }
        Returns: {
          created_at: string
          day_first_review: boolean
          day_session: string
          difficulty: number | null
          id: string
          lang: string
          phrase_id: string
          review_time_retrievability: number | null
          score: number
          stability: number | null
          uid: string
          updated_at: string
        }
      }
    }
    Enums: {
      card_status: "active" | "learned" | "skipped"
      friend_request_response:
        | "accept"
        | "decline"
        | "cancel"
        | "remove"
        | "invite"
      learning_goal: "moving" | "family" | "visiting"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      card_status: ["active", "learned", "skipped"],
      friend_request_response: [
        "accept",
        "decline",
        "cancel",
        "remove",
        "invite",
      ],
      learning_goal: ["moving", "family", "visiting"],
    },
  },
  storage: {
    Enums: {},
  },
} as const

