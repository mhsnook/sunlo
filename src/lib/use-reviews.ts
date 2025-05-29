import { DailyCacheKey, ReviewRow, uuid } from '@/types/main'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import supabase from './supabase-client'
import { useDeckCard, useDeckMeta } from './use-deck'

// export const useLang = () =>
//	useParams({ from: '/_user/learn/$lang', select: (q) => q.lang ?? null })

const todaysReviewsQuery = (
	dailyCacheKey: DailyCacheKey,
	deckId: uuid | null
) =>
	queryOptions({
		queryKey: dailyCacheKey,
		queryFn: async () =>
			(
				await supabase
					.from('user_card_review')
					.select()
					.eq('user_deck_id', deckId!)
					.eq('day_session', dailyCacheKey[3])
					.throwOnError()
			)?.data,
		enabled: deckId !== null,
	})

export function useTodaysReviews(dailyCacheKey: DailyCacheKey) {
	const lang = dailyCacheKey[1]
	const { data: meta } = useDeckMeta(lang)
	return useQuery(todaysReviewsQuery(dailyCacheKey, meta?.id ?? null))
}

export function useOneReview(dailyCacheKey: DailyCacheKey, pid: uuid) {
	const lang = dailyCacheKey[1]
	const { data: card } = useDeckCard(lang, pid)
	return useQuery({
		...todaysReviewsQuery(dailyCacheKey, card?.user_deck_id ?? null),
		select: (data: Array<ReviewRow>) =>
			data.find((r) => r.user_card_id === card?.id),
	})
}
