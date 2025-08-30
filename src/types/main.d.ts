import { Database, Enums, Tables, TablesInsert } from './supabase'
import { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import {
	PostgrestError,
	PostgrestMaybeSingleResponse,
	PostgrestResponse,
} from '@supabase/supabase-js'
import { Route } from '@tanstack/react-router'
import { LucideIcon } from 'lucide-react'
import { NonNullableFields } from './utils'

export type uuid = string
export type pids = Array<uuid>

export type LangOnlyComponentProps = {
	lang: string
}

export type RolesEnum = 'learner' | 'helper' | 'both' | null

export type AuthState = {
	isAuth: boolean
	userId: uuid | null
	userEmail: string | null
	userRole: RolesEnum
}

export type ChatMessageRow = Tables<'chat_message'>
export type ChatMessageRelative = ChatMessageRow & {
	isMine: boolean
	friendId: uuid
}
export type ChatMessageInsert = TablesInsert<'chat_message'>

export type Tag = {
	id: uuid
	name: string
}

/*
	0. not yet initialised
	1. doing the first review
	2. going back for unreviewed
	3. skip unreviewed and see screen asking to re-review
	4. doing re-reviews
	5. skip re-reviews and end
*/
export type ReviewStages = 0 | 1 | 2 | 3 | 4 | 5
export type ReviewsMap = {
	[key: uuid]: ReviewRow
}
export type ReviewsLoaded = {
	map: ReviewsMap
	totalReviewed: number
	totalAgain: number
}

export type SelectOption = { value: string; label: string }
// Don't keep using these. use the framework's types for links and routes
export type LinkType = {
	name: string
	title?: string
	inexact?: boolean
	link: {
		to: string
		params?: Route['types']['params']
	}
	// TODO enum these for the caller
	Icon?: LucideIcon
	useBadge?: () => number | boolean | undefined | null
}
export type MenuType = LinkType & {
	items: Array<LinkType>
}

export type TitleBar = {
	title: string
	subtitle?: string
	Icon?: LucideIcon
	onBackClick?: string | (() => void)
}

export type UseSBQuery<T> = UseQueryResult<T, PostgrestError>
export type UseSBMutation<T> = UseMutationResult<T, PostgrestError>
export type SBQuery<T> = Promise<PostgrestResponse<T>>
export type SBQuerySingle<T> = Promise<PostgrestMaybeSingleResponse<T>>
export type SBMutation<T> = Promise<PostgrestResponse<T>>

export type LanguageRow = Omit<Tables<'language'>, 'alias_of'>
export type LanguageMeta = Tables<'language_plus'>
export type LanguageFetched = LanguageMeta & {
	phrases: Array<PhraseFull>
}
export type PhraseStub = {
	lang: string
	id: string
	text: string
	translation: Array<{ text: string; lang: string }>
}

export type PhrasesMap = {
	[key: uuid]: PhraseFiltered
}
export type LanguageLoaded = {
	meta: LanguageMeta
	pids: pids
	phrasesMap: PhrasesMap
}

export type PhraseRow = Tables<'phrase'>
export type PhraseInsert = TablesInsert<'phrase'>
export type PhraseCardInsert =
	Database['public']['Functions']['add_phrase_translation_card']['Args']

export type Translation = Tables<'phrase_translation'>
export type TranslationRow = Tables<'phrase_translation'>
export type TranslationInsert = TablesInsert<'phrase_translation'>

export type RelationRow = Tables<'phrase_relation'>
export type RelationInsert = TablesInsert<'phrase_relation'>

export type PhraseMeta = Tables<'meta_phrase_info'>
export type PhraseFull = PhraseMeta & {
	translations: Array<TranslationRow>
	tags?: Array<Tag> | null
}
export type PhraseFiltered = PhraseFull & {
	translations_mine?: Array<TranslationRow>
	translations_other?: Array<TranslationRow>
}
export type PhraseFullInsert = PhraseInsert & {
	translations: Array<TranslationInsert>
	relation_pids?: pids
}

export type DeckRow = Tables<'user_deck'>
export type DeckStub = Tables<'user_deck'>
export type DeckInsert = TablesInsert<'user_deck'>
export type DeckMeta = Tables<'user_deck_plus'>
export type DeckFetched = DeckMeta & {
	cards: Array<CardFull>
}
// we are not literally using a map, but maybe we should!
export type CardsMap = {
	[key: uuid]: CardFull
}

export type DeckPids = {
	all: pids
	active: pids
	reviewed: pids
	reviewed_or_inactive: pids
	reviewed_last_7d: pids
	unreviewed_active: pids
	today_active: pids
}
export type DeckLoaded = {
	meta: DeckMeta
	pids: DeckPids
	cardsMap: CardsMap
	reviews: Array<ReviewRow>
	reviewsDayMap: { [key: string]: Array<ReviewRow> }
}

export type CardRow = Tables<'user_card'>
export type CardMeta = Tables<'user_card_plus'>
export type CardInsert = TablesInsert<'user_card'>
export type UserCardInsert = CardInsert // @TODO remove

export type ReviewInsert =
	Database['public']['Functions']['insert_user_card_review']['Args']
export type ReviewRow = Tables<'user_card_review'>
export type ReviewUpdate =
	Database['public']['Functions']['update_user_card_review']['Args']

export type CardFull = CardMeta & {
	reviews: Array<ReviewRow>
}

export type DailyReviewStateFetched =
	| null
	| (ReviewStateManifestRow & {
			user_card_review: Array<ReviewRow>
	  })
export type DailyReviewStateLoaded = ReviewStateManifestRow & {
	reviewsMap: ReviewsMap
	stats: ReviewStats
}
export type ReviewStats = {
	reviewed: number
	unreviewed: number
	again: number
	count: number
	complete: number
	firstUnreviewedIndex: number
	firstAgainIndex: number
	inferred: {
		stage: ReviewStages
		index: number
	}
}
type ReviewStateManifestRow = Tables<'user_deck_review_state'> & {
	manifest: pids
}

export type PublicProfile = NonNullableFields<
	Omit<Tables<'public_profile'>, 'avatar_path'> & {
		avatarUrl: string
	}
>
export type ProfileRow = Tables<'user_profile'>
export type ProfileInsert = TablesInsert<'user_profile'>
export type ProfileMeta = ProfileRow // Tables<'profile_meta'>
export type ProfileFull = NonNullableFields<Tables<'user_profile'>> & {
	avatarUrl: string
	languagesToShow: Array<string>
	decksMap: DecksMap
	deckLanguages: Array<string>
	friendships?: Array<FriendshipRow>
}
export type DecksMap = {
	[key: string]: DeckMeta
}

export type FriendshipRow = {
	uid: uuid
	friend_uuid: uuid
	helping_with: Array<string>
	created_at: string
	updated_at: string
}

export type FriendSummary = Tables<'friend_summary'>
export type FriendRequestActionInsert = TablesInsert<'friend_request_action'>
export type FriendRequestActionRow = Tables<'friend_request_action'>
export type FriendSummaryRaw = FriendSummary & {
	profile_more: Tables<'public_profile'> | null
	profile_less: Tables<'public_profile'> | null
}

export type FriendSummaryRelative = {
	most_recent_action_type: Enums<'friend_request_response'>
	most_recent_created_at: string
	status: string
	uidOther: uuid
	isMostRecentByMe: boolean
	isMyUidMore: boolean
	profile?: PublicProfile
}

export type PublicProfileFull = PublicProfile & {
	friend_summary?: FriendSummaryRelative
}
