import type { DailyCacheKey, ReviewStages } from '@/types/main'
import supabase from './supabase-client'
import { pids, ReviewInsert, ReviewRow, ReviewUpdate, uuid } from '@/types/main'
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'

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

export const getManifestFromLocalStorage = getFromLocalStorage as (
	dailyCacheKey: DailyCacheKey
) => pids | null
export const setManifestFromLocalStorage = setFromLocalStorage

const getAgainsFromLocalManifest = (dailyCacheKey: DailyCacheKey) =>
	getManifestFromLocalStorage(dailyCacheKey)?.filter((p: uuid) => {
		return getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])?.score === 1
	}) ?? []

const getUnreviewedFromLocalManifest = (dailyCacheKey: DailyCacheKey) =>
	getManifestFromLocalStorage(dailyCacheKey)?.filter((pid: uuid) => {
		return !getReviewFromLocalStorage(dailyCacheKey, pid)
	}) ?? []

export const getReviewFromLocalStorage = (
	dailyCacheKey: DailyCacheKey,
	pid: uuid
): ReviewRow | null => getFromLocalStorage<ReviewRow>([...dailyCacheKey, pid])

export const setReviewFromLocalStorage = (
	dailyCacheKey: DailyCacheKey,
	pid: uuid,
	review: ReviewRow
) => setFromLocalStorage([...dailyCacheKey, pid], review)

export function getIndexOfNextUnreviewedCard(
	dailyCacheKey: DailyCacheKey,
	currentCardIndex: number
) {
	const pids = getManifestFromLocalStorage(dailyCacheKey)
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
	const pids = getManifestFromLocalStorage(dailyCacheKey)
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
		getManifestFromLocalStorage(dailyCacheKey)?.length ?? 0
	const foundCardIndex = getIndexOfNextAgainCard(dailyCacheKey, i)
	const finalFoundIndex =
		!(foundCardIndex === countManifestCards) ? foundCardIndex : (
			getIndexOfNextAgainCard(dailyCacheKey, -1)
		)
	return finalFoundIndex
}

export function setLocalReviewStage(
	dailyCacheKey: DailyCacheKey,
	stage: ReviewStages
) {
	setFromLocalStorage([...dailyCacheKey, 'stage'], stage)
}

export const useReviewState = (dailyCacheKey: DailyCacheKey) =>
	useSuspenseQuery({
		queryKey: [...dailyCacheKey, 'review-state'],
		queryFn: () => {
			return {
				reviewStage:
					getFromLocalStorage<ReviewStages>([...dailyCacheKey, 'stage']) ?? 0,
				totalCount: getManifestFromLocalStorage(dailyCacheKey)?.length ?? 0,
				unreviewedCount: getUnreviewedFromLocalManifest(dailyCacheKey).length,
				againCount: getAgainsFromLocalManifest(dailyCacheKey).length,
			}
		},
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	})

export const useReviewStageMutation = (dailyCacheKey: DailyCacheKey) => {
	const queryClient = useQueryClient()
	return useMutation<void, Error, ReviewStages>({
		mutationFn: async (val: ReviewStages) => {
			setLocalReviewStage(dailyCacheKey, val)
			return
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [...dailyCacheKey, 'review-state'],
			})
		},
	})
}
