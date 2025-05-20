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

export function getFromLocalStorage<T>(queryKey: Array<string>): null | T {
	const data = localStorage.getItem(JSON.stringify(queryKey))
	return typeof data === 'string' ? JSON.parse(data) : null
}

export function setFromLocalStorage(queryKey: Array<string>, value: any) {
	localStorage.setItem(JSON.stringify(queryKey), JSON.stringify(value))
}

export function addExtrasPid(dailyCacheKey: Array<string>, pid: uuid) {
	const extras = getFromLocalStorage<pids>([...dailyCacheKey, 'extras']) ?? []
	setFromLocalStorage([...dailyCacheKey, 'extras'], [...extras, pid])
}

export function getExtrasPids(dailyCacheKey: Array<string>): pids {
	return getFromLocalStorage([...dailyCacheKey, 'extras']) ?? []
}

export function getIndexOfNextUnreviewedCard(
	dailyCacheKey: Array<string>,
	currentCardIndex: number
) {
	const pids = getFromLocalStorage<pids>(dailyCacheKey)
	if (pids === null)
		throw new Error(
			'trying to fetch index of first card, but there is no review set up for today'
		)
	const index = pids.findIndex((p, i) => {
		if (currentCardIndex > i) return false
		const entry = getFromLocalStorage([...dailyCacheKey, p])
		return entry === null
	})
	return index === -1 ? pids.length : index
}

export function getIndexOfNextUnfinishedCard(
	dailyCacheKey: Array<string>,
	currentCardIndex: number
) {
	const pids = getFromLocalStorage<pids>(dailyCacheKey)
	if (pids === null)
		throw new Error(
			'trying to fetch index of first card, but there is no review set up for today'
		)
	const index = pids.findIndex((p, i) => {
		if (currentCardIndex > i) return false
		const entry = getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])
		return entry === null || entry.score === 1
	})
	const indexSecondTime = pids.findIndex((p, i) => {
		if (currentCardIndex < i) return false
		const entry = getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])
		return entry === null || entry.score === 1
	})

	return (
		index !== -1 ? index
		: indexSecondTime !== -1 ? indexSecondTime
		: pids.length
	)
}

export function countSkippedCards(
	pids: pids,
	dailyCacheKey: Array<string>
): number {
	return pids.filter((p: uuid) => {
		return !getFromLocalStorage([...dailyCacheKey, p])
	}).length
}

export function countAgainCards(
	pids: pids,
	dailyCacheKey: Array<string>
): number {
	return pids.filter((p: uuid) => {
		return getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])?.score === 1
	}).length
}

export function countUnfinishedCards(
	pids: pids,
	dailyCacheKey: Array<string>
): number {
	return pids.filter((p: uuid) => {
		return !(
			(getFromLocalStorage<ReviewRow>([...dailyCacheKey, p])?.score ?? 0) > 1
		)
	}).length
}
