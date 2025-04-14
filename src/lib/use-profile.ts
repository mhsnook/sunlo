import { PostgrestError } from '@supabase/supabase-js'
import { queryOptions, useQuery } from '@tanstack/react-query'
import type { DeckMeta, DecksMap, ProfileFull, uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { mapArray } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'

async function fetchAndShapeProfileFull() {
	const { data } = await supabase
		.from('user_profile')
		.select(`*, decks_array:user_deck_plus(*)`)
		.maybeSingle()
		.throwOnError()
	if (data === null) return null
	const { decks_array, ...profile } = data
	const decksMap: DecksMap = mapArray<DeckMeta, 'lang'>(decks_array, 'lang')
	const deckLanguages: Array<string> = decks_array
		.map((d) => d.lang)
		.filter((d) => typeof d === 'string')
	return { ...profile, decksMap, deckLanguages } as ProfileFull
}

export const profileQuery = (userId: uuid | null) =>
	queryOptions<ProfileFull | null, PostgrestError>({
		queryKey: ['user', userId],
		queryFn: async () => {
			return await fetchAndShapeProfileFull()
		},
		enabled: !!userId,
	})

export const useProfile = () => {
	const { userId } = useAuth()
	return useQuery({ ...profileQuery(userId) })
}

export const publicProfileQuery = (uid: uuid) =>
	queryOptions({
		queryKey: ['public', 'profile', uid],
		queryFn: async () => {
			const res = await supabase
				.from('public_profile')
				.select()
				.eq('uid', uid)
				.maybeSingle()
				.throwOnError()
			return res.data
		},
		enabled: typeof uid === 'string' && uid?.length > 10,
	})
