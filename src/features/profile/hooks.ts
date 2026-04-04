import { useLiveQuery } from '@tanstack/react-db'
import { myProfileCollection } from './collections'
import { useDecks } from '@/features/deck/hooks'
import type { MyProfileType } from './schemas'
import type { UseLiveQueryResult } from '@/types/main'

export const useProfile = (): UseLiveQueryResult<MyProfileType> =>
	useLiveQuery((q) => q.from({ profile: myProfileCollection }).findOne())

export const useSoundEnabled = () => {
	const { data: profile } = useProfile()
	return profile?.sound_enabled ?? true
}

export const useLanguagesToShow = () => {
	const { data: profile, isLoading: isLoading1 } = useProfile()
	const { data: decks, isLoading: isLoading2 } = useDecks()
	const deckLangs: Array<string> =
		decks?.filter((d) => !d.archived)?.map((d) => d.lang) ?? []
	const knownLangs = profile?.languages_known?.map((l) => l.lang) ?? []
	const rawArray = [...knownLangs, ...deckLangs]

	return {
		isLoading: isLoading1 || isLoading2,
		data: [...new Set(rawArray)],
	}
}
