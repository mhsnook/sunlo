import { useMemo } from 'react'
import { queryOptions } from '@tanstack/react-query'
import type { uuid } from '@/types/main'
import supabase from '@/lib/supabase-client'
import { themes } from '@/lib/deck-themes'
import { PublicProfile } from '@/routes/_user/friends/-types'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	decksCollection,
	friendSummariesCollection,
	myProfileCollection,
	publicProfilesCollection,
} from '@/lib/collections'

/*
const deckLanguages: Array<string> = decksSorted
	.map((d) => d.lang)
	.filter((d) => typeof d === 'string')
const languages_known = (profile.languages_known ?? []) as LanguageKnown[]
const languagesToShow = [
	...new Set([...languages_known.map((lk) => lk.lang), ...deckLanguages]),
]
*/

export const useProfile = () =>
	useLiveQuery((q) => q.from({ profile: myProfileCollection }).findOne())

export const useDecks = () => {
	const query = useLiveQuery((q) =>
		q
			.from({ deck: decksCollection })
			.orderBy(({ deck }) => deck.created_at, 'asc')
	)
	return useMemo(
		() => ({
			...query,
			data: query.data
				?.map((d, i) => ({
					...d,
					theme: i % themes.length,
				}))
				.toSorted((a, b) =>
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
				),
		}),
		[query]
	)
}

export const useLanguagesToShow = () => {
	const { data: profile } = useProfile()
	const { data: decks } = useDecks()
	return useMemo(() => {
		const deckLangs: Array<string> =
			decks?.filter((d) => !d.archived)?.map((d) => d.lang) ?? []
		const knownLangs = profile?.languages_known.map((l) => l.lang) ?? []
		const rawArray = [...knownLangs, ...deckLangs]
		return [...new Set(rawArray)]
	}, [profile, decks])
}

export const useOnePublicProfile = (uid: uuid) =>
	useLiveQuery((q) =>
		q
			.from({ profile: publicProfilesCollection })
			.where(({ profile }) => eq(profile.uid, uid))
			.findOne()
			.join({ relation: friendSummariesCollection }, ({ profile, relation }) =>
				eq(relation.uid, profile.uid)
			)
			.fn.select(({ profile, relation }) => ({
				...profile,
				relation:
					!relation ? null : (
						{
							...relation,
							isMostRecentByMe: relation.most_recent_uid_for === relation.uid,
						}
					),
			}))
	)

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
					} as PublicProfile | null)
				)
		},
		enabled: typeof uid === 'string' && uid?.length > 10,
	})
