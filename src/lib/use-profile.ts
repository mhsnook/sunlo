import { PostgrestError } from '@supabase/supabase-js'
import { queryOptions, useQuery } from '@tanstack/react-query'
import type {
	DeckMeta,
	DecksMap,
	ProfileFull,
	PublicProfile,
	uuid,
} from '@/types/main'
import supabase from '@/lib/supabase-client'
import { avatarUrlify, mapArray } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'

async function fetchAndShapeProfileFull(uid: uuid) {
	const { data } = await supabase
		.from('user_profile')
		.select(`*, decks_array:user_deck_plus(*)`)
		.eq('uid', uid)
		.maybeSingle()
		.throwOnError()
	if (data === null) return null
	const { decks_array, ...profile } = data
	const decksMap: DecksMap = mapArray<DeckMeta, 'lang'>(decks_array, 'lang')
	const deckLanguages: Array<string> = decks_array
		.map((d) => d.lang)
		.filter((d) => typeof d === 'string')
	return {
		...profile,
		avatar_url: avatarUrlify(profile.avatar_path),
		decksMap,
		deckLanguages,
	} as ProfileFull
}

export const profileQuery = (userId: uuid | null) =>
	queryOptions<ProfileFull | null, PostgrestError>({
		queryKey: ['user', userId],
		queryFn: async () => {
			return await fetchAndShapeProfileFull(userId!)
		},
		enabled: !!userId,
	})

export const useProfile = () => {
	const { userId } = useAuth()
	return useQuery({ ...profileQuery(userId) })
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
	return data.map((row) => ({
		...row,
		avatar_url: avatarUrlify(row.avatar_path),
	}))
}

export const publicProfileQuery = (uid: uuid) =>
	queryOptions({
		queryKey: ['public', 'profile', uid],
		queryFn: async () => {
			const { data } = await supabase
				.from('public_profile')
				.select()
				.eq('uid', uid)
				.maybeSingle()
				.throwOnError()
			return {
				...data,
				avatar_url: avatarUrlify(data?.avatar_path),
			} as PublicProfile | null
		},
		enabled: typeof uid === 'string' && uid?.length > 10,
	})
