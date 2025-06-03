import type { DailyCacheKey, ReviewStages } from '@/types/main'
import { pids, ReviewRow, uuid } from '@/types/main'
import {
	QueryClient,
	queryOptions,
	useSuspenseQuery,
} from '@tanstack/react-query'

function getFromLocalStorage<T>(queryKey: DailyCacheKey): null | T {
	const data = localStorage.getItem(JSON.stringify(queryKey))
	return typeof data === 'string' ? JSON.parse(data) : null
}

function setFromLocalStorage(queryKey: DailyCacheKey, value: any) {
	localStorage.setItem(JSON.stringify(queryKey), JSON.stringify(value))
}

export const manifestQuery = (dailyCacheKey: DailyCacheKey) =>
	queryOptions({
		queryKey: dailyCacheKey,
		queryFn: () => getFromLocalStorage<pids>(dailyCacheKey),
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
	setFromLocalStorage(dailyCacheKey, data)
	queryClient.setQueryData(dailyCacheKey, data)
}

const getAgainsFromLocalManifest = (dailyCacheKey: DailyCacheKey) =>
	getFromLocalStorage<pids>(dailyCacheKey)?.filter((p: uuid) => {
		return getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])?.score === 1
	}) ?? []

const getUnreviewedFromLocalManifest = (dailyCacheKey: DailyCacheKey) =>
	getFromLocalStorage<pids>(dailyCacheKey)?.filter((pid: uuid) => {
		return !getReviewFromLocalStorage(dailyCacheKey, pid)
	}) ?? []

const getReviewFromLocalStorage = (
	dailyCacheKey: DailyCacheKey,
	pid: uuid
): ReviewRow | null => getFromLocalStorage<ReviewRow>([...dailyCacheKey, pid])

export function getIndexOfNextUnreviewedCard(
	dailyCacheKey: DailyCacheKey,
	currentCardIndex: number
) {
	const pids = getFromLocalStorage<pids>(dailyCacheKey)
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
	const pids = getFromLocalStorage<pids>(dailyCacheKey)
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
		getFromLocalStorage<pids>(dailyCacheKey)?.length ?? 0
	const foundCardIndex = getIndexOfNextAgainCard(dailyCacheKey, i)
	const finalFoundIndex =
		!(foundCardIndex === countManifestCards) ? foundCardIndex : (
			getIndexOfNextAgainCard(dailyCacheKey, -1)
		)
	return finalFoundIndex
}

export const useReviewState = (dailyCacheKey: DailyCacheKey) =>
	useSuspenseQuery({
		queryKey: [...dailyCacheKey, 'review-state'],
		queryFn: () => {
			return {
				reviewStage:
					getFromLocalStorage<ReviewStages>([...dailyCacheKey, 'stage']) ?? 0,
				totalCount: getFromLocalStorage<pids>(dailyCacheKey)?.length ?? 0,
				unreviewedCount: getUnreviewedFromLocalManifest(dailyCacheKey).length,
				againCount: getAgainsFromLocalManifest(dailyCacheKey).length,
			}
		},
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})

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
