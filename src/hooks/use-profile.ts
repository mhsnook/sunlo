import { useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { myProfileCollection } from '@/lib/collections'
import { useDecks } from '@/hooks/use-deck'

export const useProfile = () =>
	useLiveQuery((q) => q.from({ profile: myProfileCollection }).findOne())

export const useLanguagesToShow = () => {
	const { data: profile, isLoading: isLoading1 } = useProfile()
	const { data: decks, isLoading: isLoading2 } = useDecks()
	return useMemo(() => {
		const deckLangs: Array<string> =
			decks?.filter((d) => !d.archived)?.map((d) => d.lang) ?? []
		const knownLangs = profile?.languages_known.map((l) => l.lang) ?? []
		const rawArray = [...knownLangs, ...deckLangs]
		return {
			isLoading: isLoading1 || isLoading2,
			data: [...new Set(rawArray)],
		}
	}, [profile, decks, isLoading1, isLoading2])
}
