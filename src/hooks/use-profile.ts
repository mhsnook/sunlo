import { PostgrestError } from '@supabase/supabase-js'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import type {
	DeckMeta,
	DecksMap,
	LanguageKnown,
	ProfileFull,
	PublicProfile,
	uuid,
} from '@/types/main'
import supabase from '@/lib/supabase-client'
import { avatarUrlify, mapArray } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { themes } from '@/lib/deck-themes'

export const profileQuery = (userId: uuid | null) =>
	queryOptions<ProfileFull | null, PostgrestError>({
		queryKey: ['user', userId],
		queryFn: async ({ queryKey }): Promise<ProfileFull | null> => {
			if (!queryKey[1]) return null
			const uid = queryKey[1] as uuid
			const { data } = await supabase
				.from('user_profile')
				.select(`*, decks_array:user_deck_plus(*)`)
				.eq('uid', uid)
				.maybeSingle()
				.throwOnError()
			if (data === null) return null
			const { decks_array, ...profile } = data
			const decksMap: Omit<DecksMap, 'cardsScheduledForToday'> = mapArray<
				Omit<DeckMeta, 'cardsScheduledForToday'>,
				'lang'
			>(
				decks_array
					.sort((a, b) =>
						a.created_at === b.created_at ? 0
						: a.created_at! > b.created_at! ? 1
						: -1
					)
					.map((d, i) => ({
						...d,
						theme: themes[i % decks_array.length],
					})),
				'lang'
			)

			const deckLanguages: Array<string> = decks_array
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
				avatarUrl: avatarUrlify(profile.avatar_path),
				languagesToShow,
				languages_known: languages_known,
				decksMap,
				deckLanguages,
			}
		},
	})

export const useProfile = () => {
	const { userId } = useAuth()
	return useSuspenseQuery({ ...profileQuery(userId) })
}

export const searchPublicProfilesByUsername = async (
	query: string,
	uid: uuid
): Promise<Array<PublicProfile> | null> => {
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
		:	data.map(
				(row) =>
					({
						uid: row.uid!,
						avatar_path: row.avatar_path ?? '',
						username: row.username ?? '',
						avatarUrl: avatarUrlify(row.avatar_path),
					}) as PublicProfile
			)
}

export const publicProfileQuery = (uid: uuid | null) =>
	queryOptions({
		queryKey: ['public', 'profile', uid!],
		queryFn: async ({ queryKey }: { queryKey: Array<string> }) => {
			const { data } = await supabase
				.from('public_profile')
				.select()
				.eq('uid', queryKey[2])
				.maybeSingle()
				.throwOnError()
			return !data ? null : (
					({
						uid: data.uid!,
						username: data.username ?? '',
						avatar_path: data.avatar_path ?? '',
						avatarUrl: avatarUrlify(data.avatar_path),
					} as PublicProfile | null)
				)
		},
		enabled: typeof uid === 'string' && uid?.length > 10,
	})
