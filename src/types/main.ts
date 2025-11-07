import { Database, Tables, TablesInsert } from './supabase'
import { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import {
	PostgrestError,
	PostgrestMaybeSingleResponse,
	PostgrestResponse,
} from '@supabase/supabase-js'
import { Route } from '@tanstack/react-router'
import { LucideIcon } from 'lucide-react'
import { CardReviewType } from '@/lib/schemas'

export type uuid = string
export type pids = Array<uuid>

export type LangOnlyComponentProps = {
	lang: string
}

export type CompositeQueryResults<T> =
	| { status: 'pending'; data: undefined }
	| {
			status: 'complete' | 'partial'
			data: T
	  }
	| {
			status: 'not-found'
			data: null
	  }

export type RolesEnum = 'learner' | 'helper' | 'both'

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
	[key: uuid]: CardReviewType
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
	useBadge?: () => number | string | boolean | undefined | null
}
export type MenuType = LinkType & {
	items: Array<LinkType>
}

export type TitleBar = {
	title: string
	subtitle?: string
	onBackClick?: string | (() => void)
}

export type UseSBQuery<T> = UseQueryResult<T, PostgrestError>
export type UseSBMutation<T> = UseMutationResult<T, PostgrestError>
export type SBQuery<T> = Promise<PostgrestResponse<T>>
export type SBQuerySingle<T> = Promise<PostgrestMaybeSingleResponse<T>>
export type SBMutation<T> = Promise<PostgrestResponse<T>>

export type PhraseInsert = TablesInsert<'phrase'>
export type PhraseCardInsert =
	Database['public']['Functions']['add_phrase_translation_card']['Args']

export type ReviewsDayMap = { [key: string]: Array<CardReviewType> }

export type CardInsert = TablesInsert<'user_card'>
export type UserCardInsert = CardInsert // @TODO remove

export type ReviewInsert =
	Database['public']['Functions']['insert_user_card_review']['Args']
export type ReviewRow = Tables<'user_card_review'>
export type ReviewUpdate =
	Database['public']['Functions']['update_user_card_review']['Args']

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
