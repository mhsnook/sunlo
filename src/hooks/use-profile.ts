import type { CSSProperties } from 'react'
import { PostgrestError } from '@supabase/supabase-js'
import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type {
	DeckMeta,
	DecksMap,
	LanguageKnown,
	ProfileFull,
	uuid,
} from '@/types/main'
import supabase from '@/lib/supabase-client'
import { mapArray } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { themes } from '@/lib/deck-themes'
import { PublicProfileSchema, PublicProfileType } from '@/lib/schemas'

export const profileQuery = (userId: uuid | null) =>
	queryOptions<ProfileFull | null, PostgrestError>({
		queryKey: ['user', userId, 'profile'],
		queryFn: async ({ queryKey }): Promise<ProfileFull | null> => {
			const uid = queryKey[1]
			if (typeof uid !== 'string') return null
			const { data } = await supabase
				.from('user_profile')
				.select(`*, decks_array:user_deck_plus(*)`)
				.eq('uid', uid)
				.maybeSingle()
				.throwOnError()
			if (data === null) return null
			const { decks_array, ...profile } = data
			const decksWithTheme = decks_array
				.toSorted((a, b) =>
					a.created_at! > b.created_at! ? -1
					: a.created_at! < b.created_at! ? 1
					: a.lang! > b.lang! ? -1
					: 1
				)
				.map((d, i) => {
					const theme = themes[i % themes.length]
					return {
						...d,
						theme,
						themeCss: {
							'--hue': theme?.hue,
							'--hue-off': theme?.hueOff,
							'--hue-accent': theme?.hueAccent,
						} as CSSProperties,
					}
				})

			const decksSorted = decksWithTheme.toSorted((a, b) =>
				(
					(a.most_recent_review_at || a.created_at) ===
					(b.most_recent_review_at || b.created_at)
				) ?
					0
				: (
					(a.most_recent_review_at || a.created_at!) >
					(b.most_recent_review_at || b.created_at!)
				) ?
					-1
				:	1
			)

			const decksMap: Omit<DecksMap, 'cardsScheduledForToday'> = mapArray<
				Omit<DeckMeta, 'cardsScheduledForToday'>,
				'lang'
			>(decksSorted, 'lang')

			const deckLanguages: Array<string> = decksSorted
				.map((d) => d.lang)
				.filter((d) => typeof d === 'string')
			const languages_known = (profile.languages_known ?? []) as LanguageKnown[]
			const languagesToShow = [
				...new Set([...languages_known.map((lk) => lk.lang), ...deckLanguages]),
			]
			return {
				...profile,
				updated_at: profile.updated_at ?? '',
				username: profile.username ?? '',
				avatar_path: profile.avatar_path ?? '',
				languagesToShow,
				languages_known: languages_known,
				decksMap,
				deckLanguages,
			}
		},
	})

export const useProfile = () => {
	const { userId } = useAuth()
	return useSuspenseQuery(profileQuery(userId))
}

export const useProfileLazy = () => {
	const { userId } = useAuth()
	return useQuery(profileQuery(userId))
}

export const searchPublicProfilesByUsername = async (
	query: string,
	uid: uuid
): Promise<Array<PublicProfileType> | null> => {
	if (!query) return null
	const { data } = await supabase
		.from('public_profile')
		.select('uid, username, avatar_path')
		.ilike('username', `%${query}%`)
		.neq('uid', uid)
		.limit(10)
		.throwOnError()
	return !data || data.length === 0 ?
			[]
		:	data.map((row) => PublicProfileSchema.parse(row))
}

export const publicProfileQuery = (uid: uuid | null) =>
	queryOptions({
		queryKey: ['public', 'profile', uid],
		queryFn: async () => {
			const { data } = await supabase
				.from('public_profile')
				.select()
				.eq('uid', uid!)
				.maybeSingle()
				.throwOnError()
			return !data ? null : PublicProfileSchema.parse(data)
		},
		enabled: typeof uid === 'string' && uid?.length > 10,
	})
