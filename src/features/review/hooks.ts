import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import { toastError } from '@/components/ui/sonner'
import {
	useCardIndex,
	useReviewActions,
	useReviewDayString,
	useReviewLang,
	useReviewStage,
} from './store'
import { PostgrestError } from '@supabase/supabase-js'
import { cardReviewsCollection, reviewDaysCollection } from './collections'
import { cardsCollection } from '@/features/deck/collections'
import { and, eq, useLiveQuery } from '@tanstack/react-db'
import {
	CardReviewSchema,
	type CardReviewType,
	DailyReviewStateSchema,
	type DailyReviewStateType,
} from './schemas'
import { calculateFSRS, type Score } from './fsrs'
import type { CardDirectionType } from '@/features/deck/schemas'
import type { ManifestEntry } from './manifest'
import {
	buildReviewsMap,
	findChainPredecessor,
	getIndexOfNextAgainCard,
	getIndexOfNextUnreviewedCard,
	type ReviewsMap,
	type ReviewStages,
} from './review-utils'

export type { ReviewStages, ReviewsMap }
export { buildReviewsMap }

interface PostReviewInput {
	phrase_id: uuid
	lang: string
	direction: CardDirectionType
	score: Score
	day_session: string
	day_first_review: boolean
	previousReview?: CardReviewType
}

const postReview = async (submitData: PostReviewInput) => {
	const {
		phrase_id,
		lang,
		direction,
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
			direction,
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

function mapToStats(
	reviewsMap: ReviewsMap,
	manifest: Array<ManifestEntry>,
	allReviews: Array<CardReviewType> = []
) {
	// First-try reviews: day_first_review=true reviews only
	const firstTryReviews = allReviews.filter((r) => r.day_first_review === true)
	// First-try success: recalled on first attempt (score > 1)
	const firstTrySuccess = firstTryReviews.filter((r) => r.score > 1).length
	const firstTryTotal = firstTryReviews.length

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
		// First-try stats
		firstTrySuccess,
		firstTryTotal,
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

export function useNextValid(): number {
	const currentCardIndex = useCardIndex()
	const lang = useReviewLang()
	const day_session = useReviewDayString()
	const stage = useReviewStage()
	const { data: reviewsData } = useReviewsToday(lang, day_session)
	const { manifest, reviewsMap } = reviewsData
	return (stage ?? 0) < 3 ?
			getIndexOfNextUnreviewedCard(manifest!, reviewsMap, currentCardIndex)
		:	getIndexOfNextAgainCard(manifest!, reviewsMap, currentCardIndex)
}

export function useReviewsToday(lang: string, day_session: string) {
	const reviewsQuery = useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(eq(review.lang, lang), eq(day_session, review.day_session))
				)
				// Order by created_at ASC so newest review wins per key
				.orderBy(({ review }) => review.created_at, 'asc'),
		[lang, day_session]
	)
	const reviewDayQuery = useReviewDay(lang, day_session)
	return {
		isLoading: reviewsQuery.isLoading || reviewDayQuery.isLoading,
		data: {
			...reviewDayQuery.data,
			reviews: reviewsQuery.data,
			reviewsMap: buildReviewsMap(reviewsQuery.data),
		},
	}
}

export function useReviewsTodayStats(lang: string, day_session: string) {
	const query = useReviewsToday(lang, day_session)
	const computed = mapToStats(
		query.data.reviewsMap,
		query.data.manifest ?? [],
		query.data.reviews
	)
	// Use server-persisted stage when available, fall back to inferred
	const stage = (query.data.stage as ReviewStages) ?? computed.inferred.stage
	const index =
		stage >= 5 ? computed.count
		: stage >= 3 ? computed.firstAgainIndex
		: computed.firstUnreviewedIndex
	return {
		...query,
		data: { ...computed, stage, index },
	}
}

export type ReviewStats = ReturnType<typeof useReviewsTodayStats>['data']

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
	pid: uuid,
	direction: CardDirectionType = 'forward'
): UseLiveQueryResult<CardReviewType> {
	return useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(
						eq(review.day_session, day_session),
						eq(review.phrase_id, pid),
						eq(review.direction, direction)
					)
				)
				.orderBy(({ review }) => review.created_at, 'desc')
				.limit(1)
				.findOne(),
		[day_session, pid, direction]
	)
}

/**
 * Get the most recent phase-1 review for a phrase+direction (any day, not just today).
 * Used for FSRS calculations which need the previous difficulty/stability.
 * Filters to day_first_review=true so phase-3 re-reviews (which have throwaway
 * initial FSRS values) never feed into the scheduling chain.
 */
export function useLatestReviewForPhrase(
	pid: uuid,
	direction: CardDirectionType = 'forward'
): UseLiveQueryResult<CardReviewType> {
	return useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(
						eq(review.phrase_id, pid),
						eq(review.direction, direction),
						eq(review.day_first_review, true)
					)
				)
				.orderBy(({ review }) => review.created_at, 'desc')
				.limit(1)
				.findOne(),
		[pid, direction]
	)
}

export function useReviewMutation(
	pid: uuid,
	direction: CardDirectionType,
	day_session: string,
	resetRevealCard: () => void,
	stage: number,
	prevDataToday: CardReviewType | undefined,
	latestReview: CardReviewType | undefined,
	triggerSlide: (navigate: () => void) => void
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
		mutationKey: ['user', 'review', day_session, pid, direction],
		mutationFn: async ({ score }: { score: number }) => {
			console.log(`Entering the review mutation:`, {
				day_session,
				pid,
				direction,
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
					// `latestReview` (from useLatestReviewForPhrase) is the newest
					// phase-1 row for this (pid, direction) — which IS prevDataToday
					// whenever we're in this branch. Using it as previousReview
					// would feed the row we're overwriting back into itself; using
					// `undefined` wipes the prior chain and rewrites with brand-new-
					// card values. Instead, look up the row immediately preceding
					// prevDataToday in the chain.
					const chainPredecessor = findChainPredecessor(
						cardReviewsCollection.toArray,
						pid,
						direction,
						prevDataToday.created_at
					)
					return {
						action: 'update',
						row: await updateReview({
							score: score as Score,
							review_id: prevDataToday.id,
							previousReview: chainPredecessor,
						}),
					}
				}
				// First review for this card today
				console.log(`Phase 1-2: Creating first review`, {
					pid,
					direction,
					score,
				})
				return {
					action: 'insert',
					row: await postReview({
						score: score as Score,
						phrase_id: pid,
						lang,
						direction,
						day_session,
						day_first_review: true,
						previousReview: latestReview,
					}),
				}
			}

			// Phase 3+: Re-review of "Again" cards (day_first_review=false).
			// Phase-3 rows are tracking-only (never read for scheduling), so we
			// copy the same-session phase-1 review's FSRS values directly onto
			// them — that's the snapshot that actually reflects the card's
			// state. `latestReview` is filtered to day_first_review=true and
			// is by definition the same-session phase-1 here (you can't reach
			// phase-3 without having done phase-1 today).
			if (!latestReview) {
				throw new Error(
					'Phase-3 review requires a same-session phase-1 review to copy from'
				)
			}
			const phase3Fsrs = {
				difficulty: latestReview.difficulty,
				stability: latestReview.stability,
				review_time_retrievability: latestReview.review_time_retrievability,
			}

			if (prevDataToday?.day_first_review === false) {
				console.log(`Phase 3: Updating existing phase-3 review`, {
					prevDataToday,
					score,
				})
				const { data } = await supabase
					.from('user_card_review')
					.update({
						score,
						...phase3Fsrs,
						updated_at: new Date().toISOString(),
					})
					.eq('id', prevDataToday.id)
					.select()
					.single()
					.throwOnError()
				return { action: 'update', row: data }
			}

			// First phase-3 review for this card
			console.log(`Phase 3: Creating phase-3 review`, { pid, direction, score })
			const { data } = await supabase
				.from('user_card_review')
				.insert({
					phrase_id: pid,
					lang,
					direction,
					score,
					day_session,
					day_first_review: false,
					...phase3Fsrs,
				})
				.select()
				.single()
				.throwOnError()
			return { action: 'insert', row: data }
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

			// Only sync card scheduling state from phase-1 reviews.
			// Phase-3 reviews are for tracking only — their FSRS values are
			// throwaway initial values that would corrupt the scheduling chain.
			if (data.row.day_first_review) {
				const existingCard = cardsCollection.toArray.find(
					(c) =>
						c.phrase_id === data.row.phrase_id &&
						c.direction === data.row.direction
				)
				cardsCollection.utils.writeUpdate({
					id: existingCard!.id,
					last_reviewed_at: data.row.created_at,
					difficulty: data.row.difficulty,
					stability: data.row.stability,
				})
			}

			triggerSlide(() => {
				resetRevealCard()
				// if the next is the same as current, it means we're on the final card, which
				// is the only situation where the out-of-date nextIndex needs to be corrected
				if (nextIndex === currentCardIndex && data.row.score > 1) gotoEnd()
				else gotoIndex(nextIndex)
			})
		},
		onError: (error) => {
			toastError(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})
}

export const useOneCardReviews = (
	pid: uuid,
	direction: CardDirectionType = 'forward'
): UseLiveQueryResult<CardReviewType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(eq(review.phrase_id, pid), eq(review.direction, direction))
				)
				.orderBy(({ review }) => review.created_at, 'asc'),
		[pid, direction]
	)

/**
 * Persist a stage transition to the server.
 * Call alongside the Zustand store action for responsive UI + durable state.
 */
export function useUpdateReviewStage(lang: string, day_session: string) {
	return useMutation({
		mutationFn: async (stage: number) => {
			const { data } = await supabase
				.from('user_deck_review_state')
				.update({ stage })
				.eq('lang', lang)
				.eq('day_session', day_session)
				.select()
				.single()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			reviewDaysCollection.utils.writeUpdate(DailyReviewStateSchema.parse(data))
		},
		onError: (error) => {
			console.log('Error updating review stage:', error)
		},
	})
}

/**
 * Returns the number of cards remaining in an active review session for a language.
 * Returns null if no review has started today, 0 if complete, or remaining count if in progress.
 */
export function useActiveReviewRemaining(
	lang: string,
	day_session: string
): number | null {
	const { data } = useReviewsTodayStats(lang, day_session)

	if (!data?.count) return null
	if (data.complete === data.count) return 0
	if (data.stage >= 5) return 0
	if (data.stage >= 3) return data.again > 0 ? data.again : 0
	return data.unreviewed
}
