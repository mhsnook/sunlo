import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import type { pids, RPCFunctions, UseLiveQueryResult, uuid } from '@/types/main'
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
import {
	CardReviewSchema,
	CardReviewType,
	DailyReviewStateType,
} from '@/lib/schemas'

/*
	0. not yet initialised
	1. doing the first review
	2. going back for unreviewed
	3. skip unreviewed and see screen asking to re-review
	4. doing re-reviews
	5. skip re-reviews and end
*/
export type ReviewStages = 0 | 1 | 2 | 3 | 4 | 5
export type ReviewsMap = {
	[key: uuid]: CardReviewType
}

const postReview = async (
	submitData: RPCFunctions['insert_user_card_review']['Args']
) => {
	const { data } = await supabase
		.rpc('insert_user_card_review', submitData)
		.throwOnError()

	return data
}

const updateReview = async (
	submitData:
		| RPCFunctions['update_user_card_review']['Args']
		| { review_id: uuid; score: number }
) => {
	if (!('review_id' in submitData) || !('score' in submitData))
		throw new Error('Invalid inputs; cannot update')
	const { data } = await supabase
		.rpc('update_user_card_review', submitData)
		.throwOnError()

	return data
}

function mapToStats(reviewsMap: ReviewsMap, manifest: pids) {
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

export type ReviewStats = ReturnType<typeof mapToStats>

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
	return {
		isLoading: reviewsQuery.isLoading || reviewDayQuery.isLoading,
		data: {
			...reviewDayQuery.data,
			reviewsMap: mapArray(reviewsQuery.data, 'phrase_id'),
		},
	}
}

export function useReviewsTodayStats(lang: string, day_session: string) {
	const query = useReviewsToday(lang, day_session)
	return {
		...query,
		data: mapToStats(query.data.reviewsMap, query.data.manifest ?? []),
	}
}

export function useReviewDay(
	lang: string,
	day_session: string
): UseLiveQueryResult<DailyReviewStateType> {
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

export function useOneReviewToday(
	day_session: string,
	pid: uuid
): UseLiveQueryResult<CardReviewType> {
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
	resetRevealCard: () => void,
	stage: number,
	prevData: CardReviewType | undefined
) {
	const currentCardIndex = useCardIndex()
	const lang = useReviewLang()
	const { gotoIndex, gotoEnd } = useReviewActions()
	const nextIndex = useNextValid()

	return useMutation<
		{ action: string; row: CardReviewType },
		PostgrestError,
		{ score: number }
	>({
		mutationKey: ['user', 'review', day_session, pid],
		mutationFn: async ({ score }: { score: number }) => {
			// during stages 1 & 2, corrections can be done, but only update only if score changes
			console.log(`Entering the review mutation:`, {
				day_session,
				pid,
				score,
				prevData,
				stage,
			})
			if (stage < 3 && prevData?.score === score)
				return {
					action: 'noop',
					row: prevData,
				}

			// @@TODO: this connection between the display UI and the mutation behavior is leaky
			if (stage < 3 && prevData?.id) {
				console.log(`Attempting update with`, { stage, prevData, score })
				return {
					action: 'update',
					row: await updateReview({
						score,
						review_id: prevData.id,
					}),
				}
			}
			// standard case: this should return a new review record
			console.log(`Attempting new review with`, {
				stage,
				prevData,
				pid,
				lang,
				score,
				day_session,
			})

			return {
				action: 'insert',
				row: await postReview({
					score,
					phrase_id: pid,
					lang,
					day_session,
				}),
			}
		},
		onSuccess: (data) => {
			console.log(`mutation returns:`, data)
			if (data.action === 'update') {
				cardReviewsCollection.utils.writeUpdate(
					CardReviewSchema.parse(data.row)
				)
			}
			if (data.action === 'insert') {
				cardReviewsCollection.utils.writeInsert(
					CardReviewSchema.parse(data.row)
				)
			}

			if (data.row.score === 1)
				toast('okay', { icon: '🤔', position: 'bottom-center' })
			if (data.row.score === 2)
				toast('okay', { icon: '🤷', position: 'bottom-center' })
			if (data.row.score === 3)
				toast('got it', { icon: '👍️', position: 'bottom-center' })
			if (data.row.score === 4)
				toast.success('nice', { position: 'bottom-center' })

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

export const useOneCardReviews = (
	pid: uuid
): UseLiveQueryResult<CardReviewType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) => eq(review.phrase_id, pid))
				.orderBy(({ review }) => review.created_at, 'asc'),
		[pid]
	)
