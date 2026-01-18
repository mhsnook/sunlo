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
			chat_message: {
				Row: {
					content: Json | null
					created_at: string
					id: string
					lang: string
					message_type: Database['public']['Enums']['chat_message_type']
					phrase_id: string | null
					playlist_id: string | null
					recipient_uid: string
					related_message_id: string | null
					request_id: string | null
					sender_uid: string
				}
				Insert: {
					content?: Json | null
					created_at?: string
					id?: string
					lang: string
					message_type: Database['public']['Enums']['chat_message_type']
					phrase_id?: string | null
					playlist_id?: string | null
					recipient_uid: string
					related_message_id?: string | null
					request_id?: string | null
					sender_uid?: string
				}
				Update: {
					content?: Json | null
					created_at?: string
					id?: string
					lang?: string
					message_type?: Database['public']['Enums']['chat_message_type']
					phrase_id?: string | null
					playlist_id?: string | null
					recipient_uid?: string
					related_message_id?: string | null
					request_id?: string | null
					sender_uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'chat_message_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'chat_message_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'chat_message_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'chat_message_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'chat_message_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'chat_message_playlist_id_fkey'
						columns: ['playlist_id']
						isOneToOne: false
						referencedRelation: 'phrase_playlist'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'chat_message_recipient_uid_fkey'
						columns: ['recipient_uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'chat_message_recipient_uid_fkey'
						columns: ['recipient_uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'chat_message_related_message_id_fkey'
						columns: ['related_message_id']
						isOneToOne: false
						referencedRelation: 'chat_message'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'chat_message_request_id_fkey'
						columns: ['request_id']
						isOneToOne: false
						referencedRelation: 'phrase_request'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'chat_message_sender_uid_fkey'
						columns: ['sender_uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'chat_message_sender_uid_fkey'
						columns: ['sender_uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			comment_phrase_link: {
				Row: {
					comment_id: string
					created_at: string
					id: string
					phrase_id: string
					request_id: string
					uid: string
				}
				Insert: {
					comment_id: string
					created_at?: string
					id?: string
					phrase_id: string
					request_id: string
					uid?: string
				}
				Update: {
					comment_id?: string
					created_at?: string
					id?: string
					phrase_id?: string
					request_id?: string
					uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'comment_phrase_link_comment_id_fkey'
						columns: ['comment_id']
						isOneToOne: false
						referencedRelation: 'request_comment'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'comment_phrase_link_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'comment_phrase_link_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'comment_phrase_link_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'comment_phrase_link_request_id_fkey'
						columns: ['request_id']
						isOneToOne: false
						referencedRelation: 'phrase_request'
						referencedColumns: ['id']
					},
				]
			}
			comment_upvote: {
				Row: {
					comment_id: string
					created_at: string
					uid: string
				}
				Insert: {
					comment_id: string
					created_at?: string
					uid?: string
				}
				Update: {
					comment_id?: string
					created_at?: string
					uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'comment_upvote_comment_id_fkey'
						columns: ['comment_id']
						isOneToOne: false
						referencedRelation: 'request_comment'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'comment_upvote_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'comment_upvote_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			friend_request_action: {
				Row: {
					action_type:
						| Database['public']['Enums']['friend_request_response']
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
						| Database['public']['Enums']['friend_request_response']
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
						| Database['public']['Enums']['friend_request_response']
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
						foreignKeyName: 'friend_request_action_uid_by_fkey'
						columns: ['uid_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_by_fkey'
						columns: ['uid_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_for_fkey'
						columns: ['uid_for']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_for_fkey'
						columns: ['uid_for']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_less_fkey'
						columns: ['uid_less']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_less_fkey'
						columns: ['uid_less']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_more_fkey'
						columns: ['uid_more']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_more_fkey'
						columns: ['uid_more']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
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
					added_by: string
					created_at: string
					id: string
					lang: string
					only_reverse: boolean
					text: string
					text_script: string | null
				}
				Insert: {
					added_by?: string
					created_at?: string
					id?: string
					lang: string
					only_reverse?: boolean
					text: string
					text_script?: string | null
				}
				Update: {
					added_by?: string
					created_at?: string
					id?: string
					lang?: string
					only_reverse?: boolean
					text?: string
					text_script?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
				]
			}
			phrase_playlist: {
				Row: {
					cover_image_path: string | null
					created_at: string
					deleted: boolean
					description: string | null
					href: string | null
					id: string
					lang: string
					title: string
					uid: string
					updated_at: string | null
					upvote_count: number
				}
				Insert: {
					cover_image_path?: string | null
					created_at?: string
					deleted?: boolean
					description?: string | null
					href?: string | null
					id?: string
					lang: string
					title: string
					uid?: string
					updated_at?: string | null
					upvote_count?: number
				}
				Update: {
					cover_image_path?: string | null
					created_at?: string
					deleted?: boolean
					description?: string | null
					href?: string | null
					id?: string
					lang?: string
					title?: string
					uid?: string
					updated_at?: string | null
					upvote_count?: number
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_playlist_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_playlist_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
				]
			}
			phrase_playlist_upvote: {
				Row: {
					created_at: string
					playlist_id: string
					uid: string
				}
				Insert: {
					created_at?: string
					playlist_id: string
					uid?: string
				}
				Update: {
					created_at?: string
					playlist_id?: string
					uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_playlist_upvote_playlist_id_fkey'
						columns: ['playlist_id']
						isOneToOne: false
						referencedRelation: 'phrase_playlist'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_playlist_upvote_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_playlist_upvote_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			phrase_relation: {
				Row: {
					added_by: string
					from_phrase_id: string | null
					id: string
					to_phrase_id: string | null
				}
				Insert: {
					added_by?: string
					from_phrase_id?: string | null
					id?: string
					to_phrase_id?: string | null
				}
				Update: {
					added_by?: string
					from_phrase_id?: string | null
					id?: string
					to_phrase_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_see_also_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_see_also_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_see_also_from_phrase_id_fkey'
						columns: ['from_phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_see_also_from_phrase_id_fkey'
						columns: ['from_phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_see_also_from_phrase_id_fkey'
						columns: ['from_phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_see_also_to_phrase_id_fkey'
						columns: ['to_phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_see_also_to_phrase_id_fkey'
						columns: ['to_phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_see_also_to_phrase_id_fkey'
						columns: ['to_phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
				]
			}
			phrase_request: {
				Row: {
					created_at: string
					deleted: boolean
					id: string
					lang: string
					prompt: string
					requester_uid: string
					updated_at: string | null
					upvote_count: number
				}
				Insert: {
					created_at?: string
					deleted?: boolean
					id?: string
					lang: string
					prompt: string
					requester_uid: string
					updated_at?: string | null
					upvote_count?: number
				}
				Update: {
					created_at?: string
					deleted?: boolean
					id?: string
					lang?: string
					prompt?: string
					requester_uid?: string
					updated_at?: string | null
					upvote_count?: number
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_request_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_request_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_request_requester_uid_fkey'
						columns: ['requester_uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_request_requester_uid_fkey'
						columns: ['requester_uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			phrase_request_upvote: {
				Row: {
					created_at: string
					request_id: string
					uid: string
				}
				Insert: {
					created_at?: string
					request_id: string
					uid?: string
				}
				Update: {
					created_at?: string
					request_id?: string
					uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_request_upvote_request_id_fkey'
						columns: ['request_id']
						isOneToOne: false
						referencedRelation: 'phrase_request'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_request_upvote_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_request_upvote_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			phrase_tag: {
				Row: {
					added_by: string
					created_at: string
					phrase_id: string
					tag_id: string
				}
				Insert: {
					added_by?: string
					created_at?: string
					phrase_id: string
					tag_id: string
				}
				Update: {
					added_by?: string
					created_at?: string
					phrase_id?: string
					tag_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_tag_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_tag_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_tag_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_tag_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_tag_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_tag_tag_id_fkey'
						columns: ['tag_id']
						isOneToOne: false
						referencedRelation: 'tag'
						referencedColumns: ['id']
					},
				]
			}
			phrase_translation: {
				Row: {
					added_by: string
					archived: boolean
					created_at: string
					id: string
					lang: string
					literal: string | null
					phrase_id: string
					text: string
					text_script: string | null
					updated_at: string | null
				}
				Insert: {
					added_by?: string
					archived?: boolean
					created_at?: string
					id?: string
					lang: string
					literal?: string | null
					phrase_id: string
					text: string
					text_script?: string | null
					updated_at?: string | null
				}
				Update: {
					added_by?: string
					archived?: boolean
					created_at?: string
					id?: string
					lang?: string
					literal?: string | null
					phrase_id?: string
					text?: string
					text_script?: string | null
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_translation_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_translation_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_translation_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_translation_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_translation_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_translation_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'phrase_translation_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
				]
			}
			playlist_phrase_link: {
				Row: {
					created_at: string
					href: string | null
					id: string
					order: number | null
					phrase_id: string
					playlist_id: string
					uid: string
				}
				Insert: {
					created_at?: string
					href?: string | null
					id?: string
					order?: number | null
					phrase_id: string
					playlist_id: string
					uid?: string
				}
				Update: {
					created_at?: string
					href?: string | null
					id?: string
					order?: number | null
					phrase_id?: string
					playlist_id?: string
					uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'playlist_phrase_link_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'playlist_phrase_link_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'playlist_phrase_link_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'playlist_phrase_link_playlist_id_fkey'
						columns: ['playlist_id']
						isOneToOne: false
						referencedRelation: 'phrase_playlist'
						referencedColumns: ['id']
					},
				]
			}
			request_comment: {
				Row: {
					content: string
					created_at: string
					id: string
					parent_comment_id: string | null
					request_id: string
					uid: string
					updated_at: string
					upvote_count: number
				}
				Insert: {
					content: string
					created_at?: string
					id?: string
					parent_comment_id?: string | null
					request_id: string
					uid?: string
					updated_at?: string
					upvote_count?: number
				}
				Update: {
					content?: string
					created_at?: string
					id?: string
					parent_comment_id?: string | null
					request_id?: string
					uid?: string
					updated_at?: string
					upvote_count?: number
				}
				Relationships: [
					{
						foreignKeyName: 'request_comment_parent_comment_id_fkey'
						columns: ['parent_comment_id']
						isOneToOne: false
						referencedRelation: 'request_comment'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'request_comment_request_id_fkey'
						columns: ['request_id']
						isOneToOne: false
						referencedRelation: 'phrase_request'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'request_comment_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'request_comment_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			tag: {
				Row: {
					added_by: string | null
					created_at: string
					id: string
					lang: string
					name: string
				}
				Insert: {
					added_by?: string | null
					created_at?: string
					id?: string
					lang: string
					name: string
				}
				Update: {
					added_by?: string | null
					created_at?: string
					id?: string
					lang?: string
					name?: string
				}
				Relationships: [
					{
						foreignKeyName: 'tag_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'tag_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'tag_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'tag_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
				]
			}
			user_card: {
				Row: {
					created_at: string | null
					id: string
					lang: string
					phrase_id: string
					status: Database['public']['Enums']['card_status'] | null
					uid: string
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					id?: string
					lang: string
					phrase_id: string
					status?: Database['public']['Enums']['card_status'] | null
					uid?: string
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					lang?: string
					phrase_id?: string
					status?: Database['public']['Enums']['card_status'] | null
					uid?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'user_card_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_card_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_card_lang_uid_fkey'
						columns: ['uid', 'lang']
						isOneToOne: false
						referencedRelation: 'user_deck'
						referencedColumns: ['uid', 'lang']
					},
					{
						foreignKeyName: 'user_card_lang_uid_fkey'
						columns: ['uid', 'lang']
						isOneToOne: false
						referencedRelation: 'user_deck_plus'
						referencedColumns: ['uid', 'lang']
					},
					{
						foreignKeyName: 'user_card_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_card_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
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
						foreignKeyName: 'user_card_review_lang_uid_fkey'
						columns: ['uid', 'lang']
						isOneToOne: false
						referencedRelation: 'user_deck'
						referencedColumns: ['uid', 'lang']
					},
					{
						foreignKeyName: 'user_card_review_lang_uid_fkey'
						columns: ['uid', 'lang']
						isOneToOne: false
						referencedRelation: 'user_deck_plus'
						referencedColumns: ['uid', 'lang']
					},
					{
						foreignKeyName: 'user_card_review_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_review_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_review_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_review_phrase_id_uid_fkey'
						columns: ['uid', 'phrase_id']
						isOneToOne: false
						referencedRelation: 'user_card'
						referencedColumns: ['uid', 'phrase_id']
					},
					{
						foreignKeyName: 'user_card_review_phrase_id_uid_fkey'
						columns: ['uid', 'phrase_id']
						isOneToOne: false
						referencedRelation: 'user_card_plus'
						referencedColumns: ['uid', 'phrase_id']
					},
					{
						foreignKeyName: 'user_card_review_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_card_review_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_card_review_uid_lang_day_session_fkey'
						columns: ['uid', 'lang', 'day_session']
						isOneToOne: false
						referencedRelation: 'user_deck_review_state'
						referencedColumns: ['uid', 'lang', 'day_session']
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
						foreignKeyName: 'user_client_event_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_client_event_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			user_deck: {
				Row: {
					archived: boolean
					created_at: string
					daily_review_goal: number
					id: string
					lang: string
					learning_goal: Database['public']['Enums']['learning_goal']
					preferred_translation_lang: string | null
					uid: string
				}
				Insert: {
					archived?: boolean
					created_at?: string
					daily_review_goal?: number
					id?: string
					lang: string
					learning_goal?: Database['public']['Enums']['learning_goal']
					preferred_translation_lang?: string | null
					uid?: string
				}
				Update: {
					archived?: boolean
					created_at?: string
					daily_review_goal?: number
					id?: string
					lang?: string
					learning_goal?: Database['public']['Enums']['learning_goal']
					preferred_translation_lang?: string | null
					uid?: string
				}
				Relationships: [
					{
						foreignKeyName: 'user_deck_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_deck_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_deck_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_deck_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
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
						foreignKeyName: 'user_deck_review_state_lang_uid_fkey'
						columns: ['lang', 'uid']
						isOneToOne: false
						referencedRelation: 'user_deck'
						referencedColumns: ['lang', 'uid']
					},
					{
						foreignKeyName: 'user_deck_review_state_lang_uid_fkey'
						columns: ['lang', 'uid']
						isOneToOne: false
						referencedRelation: 'user_deck_plus'
						referencedColumns: ['lang', 'uid']
					},
				]
			}
			user_profile: {
				Row: {
					avatar_path: string | null
					created_at: string
					font_preference: string | null
					languages_known: Json
					uid: string
					updated_at: string | null
					username: string | null
				}
				Insert: {
					avatar_path?: string | null
					created_at?: string
					font_preference?: string | null
					languages_known?: Json
					uid?: string
					updated_at?: string | null
					username?: string | null
				}
				Update: {
					avatar_path?: string | null
					created_at?: string
					font_preference?: string | null
					languages_known?: Json
					uid?: string
					updated_at?: string | null
					username?: string | null
				}
				Relationships: []
			}
		}
		Views: {
			feed_activities: {
				Row: {
					created_at: string | null
					id: string | null
					lang: string | null
					payload: Json | null
					popularity: number | null
					type: string | null
					uid: string | null
				}
				Relationships: []
			}
			friend_summary: {
				Row: {
					most_recent_action_type:
						| Database['public']['Enums']['friend_request_response']
						| null
					most_recent_created_at: string | null
					most_recent_uid_by: string | null
					most_recent_uid_for: string | null
					status: string | null
					uid: string | null
					uid_less: string | null
					uid_more: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'friend_request_action_uid_by_fkey'
						columns: ['most_recent_uid_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_by_fkey'
						columns: ['most_recent_uid_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_for_fkey'
						columns: ['most_recent_uid_for']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_for_fkey'
						columns: ['most_recent_uid_for']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_less_fkey'
						columns: ['uid_less']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_less_fkey'
						columns: ['uid_less']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_more_fkey'
						columns: ['uid_more']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'friend_request_action_uid_more_fkey'
						columns: ['uid_more']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
			meta_language: {
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
			phrase_meta: {
				Row: {
					added_by: string | null
					avg_difficulty: number | null
					avg_stability: number | null
					count_learners: number | null
					created_at: string | null
					id: string | null
					lang: string | null
					only_reverse: boolean | null
					tags: Json | null
					text: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_added_by_fkey'
						columns: ['added_by']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'phrase_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
				]
			}
			phrase_search_index: {
				Row: {
					created_at: string | null
					id: string | null
					lang: string | null
					popularity: number | null
					search_text: string | null
					text: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'phrase_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'phrase_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
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
					difficulty: number | null
					id: string | null
					lang: string | null
					last_reviewed_at: string | null
					phrase_id: string | null
					stability: number | null
					status: Database['public']['Enums']['card_status'] | null
					uid: string | null
					updated_at: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'user_card_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_card_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_card_lang_uid_fkey'
						columns: ['uid', 'lang']
						isOneToOne: false
						referencedRelation: 'user_deck'
						referencedColumns: ['uid', 'lang']
					},
					{
						foreignKeyName: 'user_card_lang_uid_fkey'
						columns: ['uid', 'lang']
						isOneToOne: false
						referencedRelation: 'user_deck_plus'
						referencedColumns: ['uid', 'lang']
					},
					{
						foreignKeyName: 'user_card_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_meta'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_phrase_id_fkey'
						columns: ['phrase_id']
						isOneToOne: false
						referencedRelation: 'phrase_search_index'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_card_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_card_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
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
					daily_review_goal: number | null
					lang: string | null
					lang_total_phrases: number | null
					language: string | null
					learning_goal: Database['public']['Enums']['learning_goal'] | null
					most_recent_review_at: string | null
					uid: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'user_deck_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_deck_lang_fkey'
						columns: ['lang']
						isOneToOne: false
						referencedRelation: 'meta_language'
						referencedColumns: ['lang']
					},
					{
						foreignKeyName: 'user_deck_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'public_profile'
						referencedColumns: ['uid']
					},
					{
						foreignKeyName: 'user_deck_uid_fkey'
						columns: ['uid']
						isOneToOne: false
						referencedRelation: 'user_profile'
						referencedColumns: ['uid']
					},
				]
			}
		}
		Functions: {
			add_phrase_translation_card: {
				Args: {
					create_card?: boolean
					phrase_lang: string
					phrase_only_reverse?: boolean
					phrase_text: string
					phrase_text_script?: string
					translation_lang: string
					translation_text: string
					translation_text_script?: string
				}
				Returns: Json
			}
			add_tags_to_phrase: {
				Args: { p_lang: string; p_phrase_id: string; p_tags: string[] }
				Returns: Json
			}
			are_friends: { Args: { uid1: string; uid2: string }; Returns: boolean }
			bulk_add_phrases: {
				Args: {
					p_lang: string
					p_phrases: Database['public']['CompositeTypes']['phrase_with_translations_input'][]
					p_user_id: string
				}
				Returns: Json
			}
			create_comment_with_phrases: {
				Args: {
					p_content: string
					p_parent_comment_id?: string
					p_phrase_ids?: string[]
					p_request_id: string
				}
				Returns: Json
			}
			create_playlist_with_links: {
				Args: {
					cover_image_path?: string
					description?: string
					href?: string
					lang: string
					phrases?: Json
					title: string
				}
				Returns: Json
			}
			refresh_phrase_search_index: { Args: never; Returns: undefined }
			search_phrases_smart: {
				Args: {
					cursor_created_at?: string
					cursor_id?: string
					lang_filter: string
					query: string
					result_limit?: number
					sort_by?: string
				}
				Returns: {
					created_at: string
					id: string
					popularity_score: number
					similarity_score: number
				}[]
			}
			set_comment_upvote: {
				Args: { p_action: string; p_comment_id: string }
				Returns: Json
			}
			set_phrase_playlist_upvote: {
				Args: { p_action: string; p_playlist_id: string }
				Returns: Json
			}
			set_phrase_request_upvote: {
				Args: { p_action: string; p_request_id: string }
				Returns: Json
			}
			show_limit: { Args: never; Returns: number }
			show_trgm: { Args: { '': string }; Returns: string[] }
		}
		Enums: {
			card_status: 'active' | 'learned' | 'skipped'
			chat_message_type: 'recommendation' | 'accepted' | 'request' | 'playlist'
			friend_request_response:
				| 'accept'
				| 'decline'
				| 'cancel'
				| 'remove'
				| 'invite'
			language_proficiency: 'fluent' | 'proficient' | 'beginner'
			learning_goal: 'moving' | 'family' | 'visiting'
		}
		CompositeTypes: {
			phrase_with_translations_input: {
				phrase_text: string | null
				translations:
					| Database['public']['CompositeTypes']['translation_input'][]
					| null
				only_reverse: boolean | null
			}
			translation_input: {
				lang: string | null
				text: string | null
			}
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
					type: Database['storage']['Enums']['buckettype']
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
					type?: Database['storage']['Enums']['buckettype']
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
					type?: Database['storage']['Enums']['buckettype']
					updated_at?: string | null
				}
				Relationships: []
			}
			buckets_analytics: {
				Row: {
					created_at: string
					deleted_at: string | null
					format: string
					id: string
					name: string
					type: Database['storage']['Enums']['buckettype']
					updated_at: string
				}
				Insert: {
					created_at?: string
					deleted_at?: string | null
					format?: string
					id?: string
					name: string
					type?: Database['storage']['Enums']['buckettype']
					updated_at?: string
				}
				Update: {
					created_at?: string
					deleted_at?: string | null
					format?: string
					id?: string
					name?: string
					type?: Database['storage']['Enums']['buckettype']
					updated_at?: string
				}
				Relationships: []
			}
			buckets_vectors: {
				Row: {
					created_at: string
					id: string
					type: Database['storage']['Enums']['buckettype']
					updated_at: string
				}
				Insert: {
					created_at?: string
					id: string
					type?: Database['storage']['Enums']['buckettype']
					updated_at?: string
				}
				Update: {
					created_at?: string
					id?: string
					type?: Database['storage']['Enums']['buckettype']
					updated_at?: string
				}
				Relationships: []
			}
			iceberg_namespaces: {
				Row: {
					bucket_name: string
					catalog_id: string
					created_at: string
					id: string
					metadata: Json
					name: string
					updated_at: string
				}
				Insert: {
					bucket_name: string
					catalog_id: string
					created_at?: string
					id?: string
					metadata?: Json
					name: string
					updated_at?: string
				}
				Update: {
					bucket_name?: string
					catalog_id?: string
					created_at?: string
					id?: string
					metadata?: Json
					name?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'iceberg_namespaces_catalog_id_fkey'
						columns: ['catalog_id']
						isOneToOne: false
						referencedRelation: 'buckets_analytics'
						referencedColumns: ['id']
					},
				]
			}
			iceberg_tables: {
				Row: {
					bucket_name: string
					catalog_id: string
					created_at: string
					id: string
					location: string
					name: string
					namespace_id: string
					remote_table_id: string | null
					shard_id: string | null
					shard_key: string | null
					updated_at: string
				}
				Insert: {
					bucket_name: string
					catalog_id: string
					created_at?: string
					id?: string
					location: string
					name: string
					namespace_id: string
					remote_table_id?: string | null
					shard_id?: string | null
					shard_key?: string | null
					updated_at?: string
				}
				Update: {
					bucket_name?: string
					catalog_id?: string
					created_at?: string
					id?: string
					location?: string
					name?: string
					namespace_id?: string
					remote_table_id?: string | null
					shard_id?: string | null
					shard_key?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'iceberg_tables_catalog_id_fkey'
						columns: ['catalog_id']
						isOneToOne: false
						referencedRelation: 'buckets_analytics'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'iceberg_tables_namespace_id_fkey'
						columns: ['namespace_id']
						isOneToOne: false
						referencedRelation: 'iceberg_namespaces'
						referencedColumns: ['id']
					},
				]
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
					level: number | null
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
					level?: number | null
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
					level?: number | null
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
						foreignKeyName: 'objects_bucketId_fkey'
						columns: ['bucket_id']
						isOneToOne: false
						referencedRelation: 'buckets'
						referencedColumns: ['id']
					},
				]
			}
			prefixes: {
				Row: {
					bucket_id: string
					created_at: string | null
					level: number
					name: string
					updated_at: string | null
				}
				Insert: {
					bucket_id: string
					created_at?: string | null
					level?: number
					name: string
					updated_at?: string | null
				}
				Update: {
					bucket_id?: string
					created_at?: string | null
					level?: number
					name?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'prefixes_bucketId_fkey'
						columns: ['bucket_id']
						isOneToOne: false
						referencedRelation: 'buckets'
						referencedColumns: ['id']
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
						foreignKeyName: 's3_multipart_uploads_bucket_id_fkey'
						columns: ['bucket_id']
						isOneToOne: false
						referencedRelation: 'buckets'
						referencedColumns: ['id']
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
						foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey'
						columns: ['bucket_id']
						isOneToOne: false
						referencedRelation: 'buckets'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey'
						columns: ['upload_id']
						isOneToOne: false
						referencedRelation: 's3_multipart_uploads'
						referencedColumns: ['id']
					},
				]
			}
			vector_indexes: {
				Row: {
					bucket_id: string
					created_at: string
					data_type: string
					dimension: number
					distance_metric: string
					id: string
					metadata_configuration: Json | null
					name: string
					updated_at: string
				}
				Insert: {
					bucket_id: string
					created_at?: string
					data_type: string
					dimension: number
					distance_metric: string
					id?: string
					metadata_configuration?: Json | null
					name: string
					updated_at?: string
				}
				Update: {
					bucket_id?: string
					created_at?: string
					data_type?: string
					dimension?: number
					distance_metric?: string
					id?: string
					metadata_configuration?: Json | null
					name?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'vector_indexes_bucket_id_fkey'
						columns: ['bucket_id']
						isOneToOne: false
						referencedRelation: 'buckets_vectors'
						referencedColumns: ['id']
					},
				]
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			add_prefixes: {
				Args: { _bucket_id: string; _name: string }
				Returns: undefined
			}
			can_insert_object: {
				Args: { bucketid: string; metadata: Json; name: string; owner: string }
				Returns: undefined
			}
			delete_leaf_prefixes: {
				Args: { bucket_ids: string[]; names: string[] }
				Returns: undefined
			}
			delete_prefix: {
				Args: { _bucket_id: string; _name: string }
				Returns: boolean
			}
			extension: { Args: { name: string }; Returns: string }
			filename: { Args: { name: string }; Returns: string }
			foldername: { Args: { name: string }; Returns: string[] }
			get_level: { Args: { name: string }; Returns: number }
			get_prefix: { Args: { name: string }; Returns: string }
			get_prefixes: { Args: { name: string }; Returns: string[] }
			get_size_by_bucket: {
				Args: never
				Returns: {
					bucket_id: string
					size: number
				}[]
			}
			list_multipart_uploads_with_delimiter: {
				Args: {
					bucket_id: string
					delimiter_param: string
					max_keys?: number
					next_key_token?: string
					next_upload_token?: string
					prefix_param: string
				}
				Returns: {
					created_at: string
					id: string
					key: string
				}[]
			}
			list_objects_with_delimiter: {
				Args: {
					bucket_id: string
					delimiter_param: string
					max_keys?: number
					next_token?: string
					prefix_param: string
					start_after?: string
				}
				Returns: {
					id: string
					metadata: Json
					name: string
					updated_at: string
				}[]
			}
			lock_top_prefixes: {
				Args: { bucket_ids: string[]; names: string[] }
				Returns: undefined
			}
			operation: { Args: never; Returns: string }
			search: {
				Args: {
					bucketname: string
					levels?: number
					limits?: number
					offsets?: number
					prefix: string
					search?: string
					sortcolumn?: string
					sortorder?: string
				}
				Returns: {
					created_at: string
					id: string
					last_accessed_at: string
					metadata: Json
					name: string
					updated_at: string
				}[]
			}
			search_legacy_v1: {
				Args: {
					bucketname: string
					levels?: number
					limits?: number
					offsets?: number
					prefix: string
					search?: string
					sortcolumn?: string
					sortorder?: string
				}
				Returns: {
					created_at: string
					id: string
					last_accessed_at: string
					metadata: Json
					name: string
					updated_at: string
				}[]
			}
			search_v1_optimised: {
				Args: {
					bucketname: string
					levels?: number
					limits?: number
					offsets?: number
					prefix: string
					search?: string
					sortcolumn?: string
					sortorder?: string
				}
				Returns: {
					created_at: string
					id: string
					last_accessed_at: string
					metadata: Json
					name: string
					updated_at: string
				}[]
			}
			search_v2: {
				Args: {
					bucket_name: string
					levels?: number
					limits?: number
					prefix: string
					sort_column?: string
					sort_column_after?: string
					sort_order?: string
					start_after?: string
				}
				Returns: {
					created_at: string
					id: string
					key: string
					last_accessed_at: string
					metadata: Json
					name: string
					updated_at: string
				}[]
			}
		}
		Enums: {
			buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR'
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
	:	never = never,
> =
	DefaultSchemaTableNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		(DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends (
			{
				Row: infer R
			}
		) ?
			R
		:	never
	: DefaultSchemaTableNameOrOptions extends (
		keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
	) ?
		(DefaultSchema['Tables'] &
			DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends (
			{
				Row: infer R
			}
		) ?
			R
		:	never
	:	never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
	:	never = never,
> =
	DefaultSchemaTableNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends (
			{
				Insert: infer I
			}
		) ?
			I
		:	never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] ?
		DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends (
			{
				Insert: infer I
			}
		) ?
			I
		:	never
	:	never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
	:	never = never,
> =
	DefaultSchemaTableNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends (
			{
				Update: infer U
			}
		) ?
			U
		:	never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] ?
		DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends (
			{
				Update: infer U
			}
		) ?
			U
		:	never
	:	never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
	:	never = never,
> =
	DefaultSchemaEnumNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] ?
		DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
	:	never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
	:	never = never,
> =
	PublicCompositeTypeNameOrOptions extends (
		{
			schema: keyof DatabaseWithoutInternals
		}
	) ?
		DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends (
		keyof DefaultSchema['CompositeTypes']
	) ?
		DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
	:	never

export const Constants = {
	public: {
		Enums: {
			card_status: ['active', 'learned', 'skipped'],
			chat_message_type: ['recommendation', 'accepted', 'request', 'playlist'],
			friend_request_response: [
				'accept',
				'decline',
				'cancel',
				'remove',
				'invite',
			],
			language_proficiency: ['fluent', 'proficient', 'beginner'],
			learning_goal: ['moving', 'family', 'visiting'],
		},
	},
	storage: {
		Enums: {
			buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
		},
	},
} as const
