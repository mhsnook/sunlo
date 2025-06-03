import type { DailyCacheKey, ReviewStages } from '@/types/main'
import { pids, ReviewRow, uuid } from '@/types/main'
import {
	QueryClient,
	queryOptions,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useReviewsToday } from '@/lib/use-reviews'

function getFromLocalStorage<T>(queryKey: DailyCacheKey): null | T {
	const data = localStorage.getItem(JSON.stringify(queryKey))
	return typeof data === 'string' ? JSON.parse(data) : null
}

function setFromLocalStorage(queryKey: DailyCacheKey, value: any) {
	localStorage.setItem(JSON.stringify(queryKey), JSON.stringify(value))
}

export const manifestQuery = (dailyCacheKey: DailyCacheKey) =>
	queryOptions({
		queryKey: [...dailyCacheKey, 'manifest'],
		queryFn: () => getFromLocalStorage<pids>([...dailyCacheKey, 'manifest']),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})

export const useManifest = (dailyCacheKey: DailyCacheKey) =>
	useSuspenseQuery(manifestQuery(dailyCacheKey))

export const setManifest = (
	dailyCacheKey: DailyCacheKey,
	data: pids,
	queryClient: QueryClient
) => {
	setFromLocalStorage([...dailyCacheKey, 'manifest'], data)
	queryClient.setQueryData([...dailyCacheKey, 'manifest'], data)
}

const getReviewFromLocalStorage = (
	dailyCacheKey: DailyCacheKey,
	pid: uuid
): ReviewRow | null => getFromLocalStorage<ReviewRow>([...dailyCacheKey, pid])

export function getIndexOfNextUnreviewedCard(
	dailyCacheKey: DailyCacheKey,
	currentCardIndex: number
) {
	const pids = getFromLocalStorage<pids>([...dailyCacheKey, 'manifest'])
	if (pids === null)
		throw new Error(
			'trying to fetch index of next card, but there is no review set up for today'
		)
	const index = pids.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		if (i <= currentCardIndex) return false
		const entry = getReviewFromLocalStorage(dailyCacheKey, pid)
		return entry === null
	})

	return index !== -1 ? index : pids.length
}

function getIndexOfNextAgainCard(
	dailyCacheKey: DailyCacheKey,
	currentCardIndex: number
) {
	const pids = getFromLocalStorage<pids>([...dailyCacheKey, 'manifest'])
	if (pids === null)
		throw new Error(
			'trying to fetch index of next card, but there is no review set up for today'
		)
	const index = pids.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		if (i <= currentCardIndex) return false
		const entry = getReviewFromLocalStorage(dailyCacheKey, pid)
		return entry?.score === 1
	})

	return index !== -1 ? index : pids.length
}

export function getIndexOfLoopedAgainCard(
	dailyCacheKey: DailyCacheKey,
	i: number
) {
	const countManifestCards =
		getFromLocalStorage<pids>([...dailyCacheKey, 'manifest'])?.length ?? 0
	const foundCardIndex = getIndexOfNextAgainCard(dailyCacheKey, i)
	const finalFoundIndex =
		!(foundCardIndex === countManifestCards) ? foundCardIndex : (
			getIndexOfNextAgainCard(dailyCacheKey, -1)
		)
	return finalFoundIndex
}

export const useReviewState = (dailyCacheKey: DailyCacheKey) => {
	const { data: reviews } = useReviewsToday(dailyCacheKey)
	const { data: manifest } = useManifest(dailyCacheKey)

	return useSuspenseQuery({
		queryKey: [...dailyCacheKey, 'review-state'],
		queryFn: () => {
			const res = {
				reviewStage:
					getFromLocalStorage<ReviewStages>([...dailyCacheKey, 'stage']) ?? 0,
				totalCount: manifest?.length ?? 0,
				unreviewedCount: manifest?.filter(
					(pid) => !reviews?.find((r) => r.phrase_id === pid)
				).length,
				againCount: manifest?.filter((pid) =>
					reviews?.find((r) => r.phrase_id === pid && r.score === 1)
				).length,
			}
			console.log('useReviewState', res)
			return res
		},
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})
}

export const setReviewStage = (
	dailyCacheKey: DailyCacheKey,
	data: ReviewStages,
	queryClient: QueryClient
) => {
	setFromLocalStorage([...dailyCacheKey, 'stage'], data)
	queryClient.setQueryData([...dailyCacheKey, 'stage'], data)
	queryClient.invalidateQueries({
		queryKey: [...dailyCacheKey, 'review-state'],
	})
}

// for when you DON'T want to send a mutation to the DB
// (second review in a day doesn't count for the algo)
export const setOneReview = (
	dailyCacheKey: DailyCacheKey,
	pid: uuid,
	data: ReviewRow,
	queryClient: QueryClient
) => {
	queryClient.setQueryData([...dailyCacheKey, pid], data)
	setFromLocalStorage([...dailyCacheKey, pid], data)
}
