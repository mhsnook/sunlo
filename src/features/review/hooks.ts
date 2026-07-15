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
import {
	cardReviewsCollection,
	reviewDaysCollection,
	reviewMilestonesCollection,
} from './collections'
import { cardsCollection } from '@/features/deck/collections'
import { and, eq, inArray, lt, useLiveQuery } from '@tanstack/react-db'
import {
	CardReviewSchema,
	type CardReviewType,
	type DailyReviewStateType,
	ReviewMilestoneSchema,
} from './schemas'
import { useUserId } from '@/lib/use-auth'
import { calculateFSRS, type Score } from './fsrs'
import type { CardDirectionType } from '@/features/deck/schemas'
import { toManifestEntry, type ManifestEntry } from './manifest'
import {
	buildReviewsMap,
	findChainPredecessor,
	getIndexOfNextAgainCard,
	getIndexOfNextUnreviewedCard,
	isScoringReview,
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
	stage: number
	previousReview?: CardReviewType
}

const postReview = async (submitData: PostReviewInput) => {
	const {
		phrase_id,
		lang,
		direction,
		score,
		day_session,
		stage,
		previousReview,
	} = submitData

	// Calculate FSRS values client-side. Stage-3 (again-round) rows are
	// tracking-only — they carry null FSRS columns and never feed scheduling —
	// so only the scoring stages compute real values.
	const fsrs = isScoringReview({ stage })
		? calculateFSRS({ score, previousReview })
		: { difficulty: null, stability: null, retrievability: null }

	// Direct insert - CHECK constraints on table validate the values
	const { data } = await supabase
		.from('user_card_review')
		.insert({
			phrase_id,
			lang,
			direction,
			score,
			day_session,
			stage,
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
	// First-try reviews: scoring-pass reviews only (stages 1–2)
	const firstTryReviews = allReviews.filter(isScoringReview)
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
		stats.reviewed < stats.count ? 1 : stats.again === 0 ? 5 : 4
	const index =
		stage === 4
			? stats.firstAgainIndex
			: stage === 5
				? manifest.length
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
	return (stage ?? 0) < 3
		? getIndexOfNextUnreviewedCard(manifest!, reviewsMap, currentCardIndex)
		: getIndexOfNextAgainCard(manifest!, reviewsMap, currentCardIndex)
}

/**
 * The server-persisted stage for a session: the `stage` of the latest
 * review_milestone. Replaces the old mutable `user_deck_review_state.stage` —
 * progress is now an append-only log, so the newest milestone wins. Returns
 * undefined when no milestone has landed yet (brand-new session), which lets
 * callers fall back to the client-inferred stage.
 */
export function useReviewStageServer(
	lang: string,
	day_session: string
): ReviewStages | undefined {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ milestone: reviewMilestonesCollection })
				.where(({ milestone }) =>
					and(eq(milestone.lang, lang), eq(milestone.day_session, day_session))
				)
				.orderBy(({ milestone }) => milestone.created_at, 'desc')
				.limit(1)
				.findOne(),
		[lang, day_session]
	)
	return (data?.stage ?? undefined) as ReviewStages | undefined
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
	// Stage now folds out of the append-only milestone log, not the session row.
	const stage = useReviewStageServer(lang, day_session)
	return {
		isLoading: reviewsQuery.isLoading || reviewDayQuery.isLoading,
		data: {
			...reviewDayQuery.data,
			stage,
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
		stage >= 5
			? computed.count
			: stage >= 3
				? computed.firstAgainIndex
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

/**
 * The manifest is the authoritative list of cards for a review session —
 * it's persisted server-side, so any device loading today's session sees
 * the same set. Local `cardsCollection` can drift from that (long-lived
 * PWA without refetches, server-side data migrations, sessions authored
 * on another device), and if the manifest references a card the local
 * collection has never heard of, the review mutation can't find it when
 * syncing FSRS state. Refetch once to self-heal before the session starts.
 */
export async function ensureManifestCardsInCollection(
	lang: string,
	day_session: string
) {
	const reviewDay = reviewDaysCollection.toArray.find(
		(d) => d.lang === lang && d.day_session === day_session
	)
	if (!reviewDay?.manifest?.length) return

	const present = new Set<string>(
		cardsCollection.toArray.map((c) =>
			toManifestEntry(c.phrase_id, c.direction)
		)
	)
	const missing = reviewDay.manifest.some((entry) => !present.has(entry))
	if (missing) {
		console.warn(
			`Review manifest references cards not in local cardsCollection; refetching to self-heal.`,
			{ lang, day_session }
		)
		await cardsCollection.utils.refetch()
	}
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
 * Get the most recent scoring review for a phrase+direction (any day, not just today).
 * Used for FSRS calculations which need the previous difficulty/stability.
 * Filters to the scoring stages (1–2) so again-round re-reviews (which carry
 * null FSRS values) never feed into the scheduling chain.
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
						inArray(review.stage, [1, 2])
					)
				)
				.orderBy(({ review }) => review.created_at, 'desc')
				.limit(1)
				.findOne(),
		[pid, direction]
	)
}

/**
 * The chain predecessor: the most recent scoring review from a session
 * strictly earlier than `day_session`. Use this — not `useLatestReviewForPhrase`
 * — when you need "where was the card before today" for display (e.g. the
 * interval badges on each answer button). If today's row has already been
 * written, `useLatestReviewForPhrase` returns TODAY's row and any downstream
 * computation starts compounding on already-updated state, making the badges
 * flicker to different values after re-visiting a card.
 */
export function useChainPredecessorForPhrase(
	pid: uuid,
	direction: CardDirectionType,
	day_session: string
): UseLiveQueryResult<CardReviewType> {
	return useLiveQuery(
		(q) =>
			q
				.from({ review: cardReviewsCollection })
				.where(({ review }) =>
					and(
						eq(review.phrase_id, pid),
						eq(review.direction, direction),
						inArray(review.stage, [1, 2]),
						lt(review.day_session, day_session)
					)
				)
				.orderBy(({ review }) => review.day_session, 'desc')
				.orderBy(({ review }) => review.created_at, 'desc')
				.limit(1)
				.findOne(),
		[pid, direction, day_session]
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

			// Stages 1-2 (scoring pass): the first pass through the manifest plus
			// the go-back pass for skipped cards. These are the reviews FSRS reads.
			// - same score as the existing row → noop
			// - different score on an existing row → correction, update in place
			// - otherwise → insert a new scoring review at the current stage
			if (stage < 3) {
				if (prevDataToday?.score === score) {
					return { action: 'noop', row: prevDataToday }
				}
				if (prevDataToday?.id) {
					console.log(`Scoring pass: correcting existing review`, {
						prevDataToday,
						score,
					})
					// Correction: the user went back and re-scored a card they already
					// answered this session. Amend the existing row rather than append.
					// `latestReview` (from useLatestReviewForPhrase) is the newest
					// scoring row for this (pid, direction) — which IS prevDataToday
					// whenever we're in this branch. Using it as previousReview would
					// feed the row we're overwriting back into itself; `undefined`
					// wipes the prior chain and rewrites with brand-new-card values.
					// Instead, look up the chain's predecessor — the newest scoring
					// review from any strictly earlier session.
					const chainPredecessor = findChainPredecessor(
						cardReviewsCollection.toArray,
						pid,
						direction,
						day_session
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
				// First scoring review for this card today.
				console.log(`Scoring pass: creating review`, {
					pid,
					direction,
					score,
					stage,
				})
				return {
					action: 'insert',
					row: await postReview({
						score: score as Score,
						phrase_id: pid,
						lang,
						direction,
						day_session,
						stage,
						previousReview: latestReview,
					}),
				}
			}

			// Stage 3 (again-round): re-reviews of "Again" cards. Append-only —
			// each tap becomes its own tracking row with null FSRS columns, so how
			// many times a card was retried is counted rather than overwritten.
			// There is no back button in this stage, so there are no corrections
			// to amend; every tap inserts.
			console.log(`Again-round: appending review`, { pid, direction, score })
			return {
				action: 'insert',
				row: await postReview({
					score: score as Score,
					phrase_id: pid,
					lang,
					direction,
					day_session,
					stage: 3,
				}),
			}
		},
		onSuccess: (data) => {
			console.log(`mutation returns:`, data)
			// The DB write has already succeeded. Any failure below is a local
			// sync problem, not a review-posting problem — isolate it so a misleading
			// "error posting your review" toast never fires, and so the slide
			// transition always runs and the user isn't stuck on the same card.
			try {
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

				// Only sync card scheduling state from scoring reviews (stages 1–2).
				// Again-round rows are for tracking only — they carry null FSRS
				// values that would corrupt the scheduling chain.
				if (isScoringReview(data.row)) {
					const existingCard = cardsCollection.toArray.find(
						(c) =>
							c.phrase_id === data.row.phrase_id &&
							c.direction === data.row.direction
					)
					if (existingCard) {
						cardsCollection.utils.writeUpdate({
							id: existingCard.id,
							last_reviewed_at: data.row.created_at,
							difficulty: data.row.difficulty,
							stability: data.row.stability,
						})
					} else {
						console.warn(
							`Review saved to DB, but no matching card found in local cardsCollection to update.`,
							{
								phrase_id: data.row.phrase_id,
								direction: data.row.direction,
							}
						)
					}
				}
			} catch (err) {
				console.error(
					`Review saved, but failed to sync local collections:`,
					err
				)
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
 * Persist a stage transition to the server as an append-only milestone.
 * Call alongside the Zustand store action for responsive UI + durable state.
 * The current stage is the newest milestone's — no in-place update, so two
 * devices mid-session no longer clobber each other's whole-row state.
 */
export function useUpdateReviewStage(lang: string, day_session: string) {
	const userId = useUserId()
	return useMutation({
		mutationFn: async (stage: number) => {
			const { data } = await supabase
				.from('review_milestone')
				.insert({
					uid: userId!,
					lang,
					day_session,
					event: stage >= 5 ? 'session_completed' : 'stage_advanced',
					stage,
				})
				.select()
				.single()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			reviewMilestonesCollection.utils.writeInsert(
				ReviewMilestoneSchema.parse(data)
			)
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
