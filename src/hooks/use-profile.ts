import { useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { myProfileCollection } from '@/lib/collections'
import { useDecks } from '@/hooks/use-deck'
import { MyProfileType } from '@/lib/schemas'

type UseLiveQueryResult<T> = {
	data?: T | undefined
	isReady?: boolean
	isLoading?: boolean
	// add any other pieces of the live query result you actually use
}

export const useProfile = (): UseLiveQueryResult<MyProfileType> =>
	useLiveQuery((q) => q.from({ profile: myProfileCollection }).findOne())

export const useHasProfile = () => {
	const { data, isReady } = useProfile()
	console.log(`running useHasProfile`, data)
	return useMemo(() => (!isReady ? undefined : !!data), [data, isReady])
}

export const useLanguagesToShow = () => {
	const { data: profile, isLoading: isLoading1 } = useProfile()
	const { data: decks, isLoading: isLoading2 } = useDecks()
	return useMemo(() => {
		const deckLangs: Array<string> =
			decks?.filter((d) => !d.archived)?.map((d) => d.lang) ?? []
		const knownLangs = profile?.languages_known?.map((l) => l.lang) ?? []
		const rawArray = [...knownLangs, ...deckLangs]
		return {
			isLoading: isLoading1 || isLoading2,
			data: [...new Set(rawArray)],
		}
	}, [profile, decks, isLoading1, isLoading2])
}
