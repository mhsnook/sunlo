import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import {
	pids,
	ReviewInsert,
	ReviewsMap,
	ReviewStages,
	ReviewStats,
	uuid,
} from '@/types/main'
import toast from 'react-hot-toast'
import {
	getIndexOfNextAgainCard,
	getIndexOfNextUnreviewedCard,
	useCardIndex,
	useNextValid,
	useReviewActions,
	useReviewLang,
} from './use-review-store'
import { PostgrestError } from '@supabase/supabase-js'
import { mapArray } from '@/lib/utils'
import { cardReviewsCollection, reviewDaysCollection } from '@/lib/collections'
import { and, eq, useLiveQuery } from '@tanstack/react-db'
import { CardReviewType } from '@/lib/schemas'

const postReview = async (submitData: ReviewInsert) => {
	const { data } = await supabase
		.rpc('insert_user_card_review', submitData)
		.throwOnError()

	return data
}

const updateReview = async (
	submitData: ReviewInsert | { review_id: uuid; score: number }
) => {
	if (!('review_id' in submitData) || !('score' in submitData))
		throw new Error('Invalid inputs; cannot update')
	const { data } = await supabase
		.rpc('update_user_card_review', submitData)
		.throwOnError()

	return data
}

function mapToStats(reviewsMap: ReviewsMap, manifest: pids): ReviewStats {
	const stats = {
		reviewed: Object.keys(reviewsMap).length,
		again: Object.values(reviewsMap).filter((r) => r.score === 1).length,
		count: manifest?.length ?? 0,
		firstUnreviewedIndex: getIndexOfNextUnreviewedCard(
			manifest,
			reviewsMap,
			-1
		),
		firstAgainIndex: getIndexOfNextAgainCard(manifest, reviewsMap, -1),
	}

	const stage: ReviewStages =
		stats.reviewed < stats.count ? 1
		: stats.again === 0 ? 5
		: 4
	const index =
		stage === 4 ? stats.firstAgainIndex
		: stage === 5 ? manifest.length
		: stats.firstUnreviewedIndex

	return {
		...stats,
		unreviewed: stats.count - stats.reviewed,
		complete: stats.reviewed - stats.again,
		inferred: { stage, index },
	}
}

export function useReviewsToday(lang: string, day_session: string) {
	const reviewsQuery = useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(eq(review.lang, lang), eq(day_session, review.day_session))
				),
		[lang, day_session]
	)
	const reviewDayQuery = useReviewDay(lang, day_session)
	return useMemo(
		() => ({
			isLoading: reviewsQuery.isLoading || reviewDayQuery.isLoading,
			data: {
				...reviewDayQuery.data,
				reviewsMap: mapArray(reviewsQuery.data, 'phrase_id'),
			},
		}),
		[reviewsQuery, reviewDayQuery]
	)
}

export function useReviewsTodayStats(lang: string, day_session: string) {
	const query = useReviewsToday(lang, day_session)
	return useMemo(
		() => ({
			...query,
			data: mapToStats(query.data.reviewsMap, query.data.manifest ?? []),
		}),
		[query]
	)
}

export function useReviewDay(lang: string, day_session: string) {
	return useLiveQuery(
		(q) =>
			q
				.from({ day: reviewDaysCollection })
				.where(({ day }) =>
					and(eq(day.day_session, day_session), eq(day.lang, lang))
				)
				.findOne(),
		[lang, day_session]
	)
}

export function useOneReviewToday(day_session: string, pid: uuid) {
	return useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(eq(review.day_session, day_session), eq(review.phrase_id, pid))
				)
				.orderBy(({ review }) => review.created_at, 'desc')
				.limit(1)
				.findOne(),
		[day_session, pid]
	)
}

export function useReviewMutation(
	pid: uuid,
	day_session: string,
	resetRevealCard: () => void
) {
	const currentCardIndex = useCardIndex()
	const lang = useReviewLang()
	const { gotoIndex, gotoEnd } = useReviewActions()
	const nextIndex = useNextValid()

	return useMutation<CardReviewType, PostgrestError, { score: number }>({
		mutationKey: ['user', 'review', day_session, pid],
		mutationFn: async ({ score }: { score: number }) => {
			// during stages 1 & 2, these are corrections; only update only if score changes
			if (stage < 3 && prevData?.score === score) return prevData

			if (stage < 3 && prevData?.id)
				return await updateReview({
					score,
					review_id: prevData.id,
				})

			// standard case: this should be represented by a new review record
			return await postReview({
				score,
				phrase_id: pid,
				lang,
				day_session,
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

			const mergedData = { ...prevData, ...data, day_first_review: !prevData }
			cardReviewsCollection.utils.writeInsert(mergedData)

			setTimeout(() => {
				resetRevealCard()
				// if the next is the same as current, it means we're on the final card, which
				// is the only situation where the out-of-date nextIndex needs to be corrected
				if (nextIndex === currentCardIndex && data.row.score > 1) gotoEnd()
				else gotoIndex(nextIndex)
			}, 1000)
		},
		onError: (error) => {
			toast.error(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})
}

export const useOneCardReviews = (pid: uuid) =>
	useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) => eq(review.phrase_id, pid))
				.orderBy(({ review }) => review.created_at, 'asc'),
		[pid]
	)
