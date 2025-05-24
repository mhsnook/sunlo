import type { DailyCacheKey } from '@/types/main'
import supabase from './supabase-client'
import { pids, ReviewInsert, ReviewRow, ReviewUpdate, uuid } from '@/types/main'

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

export const getAgainsFromLocalStorage = (dailyCacheKey: DailyCacheKey) =>
	getFromLocalStorage<pids>([...dailyCacheKey, 'agains'])

export const setAgainsFromLocalStorage = (
	dailyCacheKey: DailyCacheKey,
	data: any
) => setFromLocalStorage([...dailyCacheKey, 'agains'], data)

export function setAgainPids(dailyCacheKey: DailyCacheKey) {
	const agains = getManifestFromLocalStorage(dailyCacheKey)?.filter((pid) => {
		const review = getFromLocalStorage<ReviewRow>([...dailyCacheKey, pid])
		return review?.score === 1
	})
	setAgainsFromLocalStorage(dailyCacheKey, agains)
}

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
	const index = pids.findIndex((p, i) => {
		// if we're currently at card 3 of 40, don't even check cards 0-3
		if (i <= currentCardIndex) return false
		const entry = getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])
		return entry === null || entry.score === 1
	})

	return index !== -1 ? index : pids.length
}

export function getIndexOfNextAgainCard(
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

export function countUnreviewedCards(
	pids: pids,
	dailyCacheKey: DailyCacheKey
): number {
	return pids.filter((pid: uuid) => {
		return !getReviewFromLocalStorage(dailyCacheKey, pid)
	}).length
}

export function countAgainCards(
	pids: pids,
	dailyCacheKey: DailyCacheKey
): number {
	return pids.filter((p: uuid) => {
		return getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])?.score === 1
	}).length
}
