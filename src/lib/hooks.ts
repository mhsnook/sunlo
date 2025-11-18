import { useMemo } from 'react'
import { useDecks } from '@/hooks/use-deck'

export function useDeckLangs() {
	const { data } = useDecks()
	return useMemo(() => data?.map((d) => d.lang), [data])
}
