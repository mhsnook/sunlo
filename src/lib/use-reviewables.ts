import type { DailyCacheKey, ReviewStages } from '@/types/main'
import { pids, ReviewsLoaded } from '@/types/main'
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

export function getIndexOfNextUnreviewedCard(
	queryClient: QueryClient,
	dailyCacheKey: DailyCacheKey,
	manifest: pids,
	currentCardIndex: number
) {
	if (manifest === null)
		throw new Error(
			'trying to fetch index of next card, but there is no review set up for today'
		)
	const reviews = queryClient.getQueryData<ReviewsLoaded>(dailyCacheKey)
	const index = manifest.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		if (i <= currentCardIndex) return false
		const entry = reviews?.map[pid]
		// if the entry is undefined, it means we haven't reviewed this card yet
		return !entry
	})

	return index !== -1 ? index : manifest.length
}

function getIndexOfNextAgainCard(
	queryClient: QueryClient,
	dailyCacheKey: DailyCacheKey,
	manifest: pids,
	currentCardIndex: number
) {
	if (manifest === null)
		throw new Error(
			'trying to fetch index of next card, but there is no review set up for today'
		)
	const reviews = queryClient.getQueryData<ReviewsLoaded>(dailyCacheKey)
	const index = manifest.findIndex((pid, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		if (i <= currentCardIndex) return false
		return reviews?.map[pid]?.score === 1
	})

	return index !== -1 ? index : manifest.length
}

export function getIndexOfLoopedAgainCard(
	queryClient: QueryClient,
	dailyCacheKey: DailyCacheKey,
	manifest: pids,
	i: number
) {
	const foundCardIndex = getIndexOfNextAgainCard(
		queryClient,
		dailyCacheKey,
		manifest,
		i
	)
	const finalFoundIndex =
		!(foundCardIndex === manifest.length) ?
			foundCardIndex
		:	getIndexOfNextAgainCard(queryClient, dailyCacheKey, manifest, -1)
	return finalFoundIndex
}

export const useReviewStage = (dailyCacheKey: DailyCacheKey) => {
	return useSuspenseQuery({
		queryKey: [...dailyCacheKey, 'stage'],
		queryFn: () =>
			getFromLocalStorage<ReviewStages>([...dailyCacheKey, 'stage']) ?? 0,
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
}
