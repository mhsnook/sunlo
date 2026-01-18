import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import type { pids, UseLiveQueryResult, uuid } from '@/types/main'
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
import { calculateFSRS, type Score } from '@/lib/fsrs'

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

interface PostReviewInput {
	phrase_id: uuid
	lang: string
	score: Score
	day_session: string
	day_first_review: boolean
	previousReview?: CardReviewType
}

const postReview = async (submitData: PostReviewInput) => {
	const {
		phrase_id,
		lang,
		score,
		day_session,
		day_first_review,
		previousReview,
	} = submitData

	// Calculate FSRS values client-side
	const fsrs = calculateFSRS({
		score,
		previousReview,
	})

	// Direct insert - CHECK constraints on table validate the values
	const { data } = await supabase
		.from('user_card_review')
		.insert({
			phrase_id,
			lang,
			score,
			day_session,
			day_first_review,
			difficulty: fsrs.difficulty,
			stability: fsrs.stability,
			review_time_retrievability: fsrs.retrievability,
		})
		.select()
		.single()
		.throwOnError()

	return data
}

interface UpdateReviewInput {
	review_id: uuid
	score: Score
	previousReview?: CardReviewType
}

const updateReview = async (submitData: UpdateReviewInput) => {
	const { review_id, score, previousReview } = submitData

	// Calculate FSRS values client-side
	const fsrs = calculateFSRS({
		score,
		previousReview,
	})

	// Direct update - CHECK constraints on table validate the values
	const { data } = await supabase
		.from('user_card_review')
		.update({
			score,
			difficulty: fsrs.difficulty,
			stability: fsrs.stability,
			updated_at: new Date().toISOString(),
		})
		.eq('id', review_id)
		.select()
		.single()
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
				)
				// Order by created_at ASC so mapArray picks the NEWEST review for each phrase
				// (mapArray assigns last item for duplicates, so newest must come last)
				.orderBy(({ review }) => review.created_at, 'asc'),
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

/**
 * Get the most recent review for a phrase (any day, not just today)
 * Used for FSRS calculations which need the previous difficulty/stability
 */
export function useLatestReviewForPhrase(
	pid: uuid
): UseLiveQueryResult<CardReviewType> {
	return useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) => eq(review.phrase_id, pid))
				.orderBy(({ review }) => review.created_at, 'desc')
				.limit(1)
				.findOne(),
		[pid]
	)
}

export function useReviewMutation(
	pid: uuid,
	day_session: string,
	resetRevealCard: () => void,
	stage: number,
	prevDataToday: CardReviewType | undefined,
	latestReview: CardReviewType | undefined
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
			console.log(`Entering the review mutation:`, {
				day_session,
				pid,
				score,
				prevDataToday,
				latestReview,
				stage,
			})

			// Stage 1-2: First pass through cards + skipped (day_first_review=true)
			// - If same score as existing review, noop
			// - If different score and review exists, update it
			// - Otherwise insert new review
			if (stage < 3) {
				if (prevDataToday?.score === score) {
					return { action: 'noop', row: prevDataToday }
				}
				if (prevDataToday?.id) {
					console.log(`Phase 1-2: Updating existing review`, {
						prevDataToday,
						score,
					})
					return {
						action: 'update',
						row: await updateReview({
							score: score as Score,
							review_id: prevDataToday.id,
							previousReview:
								latestReview?.id !== prevDataToday.id ?
									latestReview
								:	undefined,
						}),
					}
				}
				// First review for this card today
				console.log(`Phase 1-2: Creating first review`, { pid, score })
				return {
					action: 'insert',
					row: await postReview({
						score: score as Score,
						phrase_id: pid,
						lang,
						day_session,
						day_first_review: true,
						previousReview: latestReview,
					}),
				}
			}

			// Phase 3+: Re-review of "Again" cards (day_first_review=false)
			// - If there's already a phase-3 review (day_first_review=false), update it
			// - Otherwise insert new review with day_first_review=false
			if (prevDataToday?.day_first_review === false) {
				console.log(`Phase 3: Updating existing phase-3 review`, {
					prevDataToday,
					score,
				})
				return {
					action: 'update',
					row: await updateReview({
						score: score as Score,
						review_id: prevDataToday.id,
						// Don't recalculate FSRS for phase-3 reviews - they're just for tracking
						previousReview: undefined,
					}),
				}
			}

			// First phase-3 review for this card
			console.log(`Phase 3: Creating phase-3 review`, { pid, score })
			return {
				action: 'insert',
				row: await postReview({
					score: score as Score,
					phrase_id: pid,
					lang,
					day_session,
					day_first_review: false,
					previousReview: undefined, // Don't use FSRS for phase-3 reviews
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

			// Show "Review updated!" for corrections in phases 1-2
			if (data.action === 'update' && stage < 3) {
				toast.success('Review updated!', { position: 'bottom-center' })
			} else if (data.row.score === 1) {
				toast('okay', { icon: '🤔', position: 'bottom-center' })
			} else if (data.row.score === 2) {
				toast('okay', { icon: '🤷', position: 'bottom-center' })
			} else if (data.row.score === 3) {
				toast('got it', { icon: '👍️', position: 'bottom-center' })
			} else if (data.row.score === 4) {
				toast.success('nice', { position: 'bottom-center' })
			}

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
