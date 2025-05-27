import type { DailyCacheKey, ReviewStages } from '@/types/main'
import supabase from './supabase-client'
import { pids, ReviewInsert, ReviewRow, ReviewUpdate, uuid } from '@/types/main'
import {
	QueryClient,
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useDeckCard } from './use-deck'
import { PostgrestError } from '@supabase/supabase-js'

export const postReview = async (submitData: ReviewInsert) => {
	if (!submitData?.user_card_id || !submitData?.score)
		throw new Error('Invalid review; cannot log')

	const { data } = await supabase
		.rpc('insert_user_card_review', submitData)
		.throwOnError()

	return data
}

export const updateReview = async (submitData: ReviewUpdate) => {
	if (!submitData?.review_id || !submitData?.score)
		throw new Error('Invalid inputs; cannot update')
	const { data } = await supabase
		.rpc('update_user_card_review', submitData)
		.throwOnError()

	return data
}

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

export const useOneReview = (dailyCacheKey: DailyCacheKey, pid: uuid) =>
	useSuspenseQuery({
		queryKey: [...dailyCacheKey, pid],
		queryFn: () => getReviewFromLocalStorage(dailyCacheKey, pid),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})

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

// for when you want to send a mutation to the DB
// and update the local cache and this custom query cache
export function useReviewMutation(
	pid: uuid,
	dailyCacheKey: DailyCacheKey,
	proceed: () => void,
	resetRevealCard: () => void
) {
	const queryClient = useQueryClient()
	const { data: prevData } = useOneReview(dailyCacheKey, pid)
	const { data: state } = useReviewState(dailyCacheKey)
	const { data: card } = useDeckCard(pid, dailyCacheKey[1])

	return useMutation<ReviewRow, PostgrestError, { score: number }>({
		mutationKey: [...dailyCacheKey, pid],
		// @ts-expect-error ts-2322 -- because Supabase view fields are always | null
		mutationFn: async ({ score }: { score: number }) => {
			if (!card?.id)
				throw new Error('Trying card review mutation but no card exists')

			// We want 1 mutation per day per card. We can send a second mutation
			// only during stage 1 or 2, to _correct_ an improper input.

			// no mutations when re-reviewing incorrect
			if (state.reviewStage > 2)
				return {
					...prevData,
					score,
				}

			// during stages 1 and 2 send an update only if the score has changed
			if (prevData?.score === score) return prevData
			if (prevData?.id)
				return await updateReview({
					score,
					review_id: prevData.id,
				})

			// standard case: card has not been reviewed today
			return await postReview({
				score,
				user_card_id: card.id,
				day_session: dailyCacheKey[3],
			})
		},
		onSuccess: (data) => {
			if (data.score === 1)
				toast('okay', { icon: '🤔', position: 'bottom-center' })
			if (data.score === 2)
				toast('okay', { icon: '🤷', position: 'bottom-center' })
			if (data.score === 3)
				toast('got it', { icon: '👍️', position: 'bottom-center' })
			if (data.score === 4) toast.success('nice', { position: 'bottom-center' })

			const mergedData = { ...prevData, ...data }
			setOneReview(dailyCacheKey, pid, mergedData, queryClient)
			setTimeout(() => {
				resetRevealCard()
				proceed()
			}, 1000)
		},
		onError: (error) => {
			toast.error(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})
}
