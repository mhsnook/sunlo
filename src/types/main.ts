import { Database, Enums, Tables, TablesInsert } from './supabase'
import {
	QueryKey,
	UseMutationResult,
	UseQueryResult,
} from '@tanstack/react-query'
import {
	PostgrestError,
	PostgrestMaybeSingleResponse,
	PostgrestResponse,
} from '@supabase/supabase-js'
import { Route } from '@tanstack/react-router'
import { LucideIcon } from 'lucide-react'

export type uuid = string
export type pids = Array<uuid>

export type LangOnlyComponentProps = {
	lang: string
}

/*
	0. not yet initialised in localstorage
	1. doing the first review
	2. going back for unreviewed
	3. skip unreviewed and see screen asking to re-review
	4. doing re-reviews
	5. skip re-reviews and end
*/
export type ReviewStages = 0 | 1 | 2 | 3 | 4 | 5
export type DailyCacheKey = ['user', string, 'review', ...Array<string>]

export type SelectOption = { value: string; label: string }
// Don't keep using these. use the framework's types for links and routes
export type LinkType = {
	name: string
	title?: string
	link: {
		to: string
		params?: Route['types']['params']
	}
	// TODO enum these for the caller
	Icon?: LucideIcon
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

export type PublicProfile = Tables<'public_profile'>
export type ProfileRow = Tables<'user_profile'>
export type ProfileInsert = TablesInsert<'user_profile'>
export type ProfileMeta = ProfileRow // Tables<'profile_meta'>
export type ProfileFull = Tables<'user_profile'> & {
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
export type FriendSummaryFull = FriendSummary & {
	profile_more: PublicProfile
	profile_less: PublicProfile
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
