import { useCallback } from 'react'
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import {
	DailyReviewStateFetched,
	DailyReviewStateLoaded,
	pids,
	ReviewInsert,
	ReviewRow,
	ReviewsMap,
	ReviewStages,
	ReviewStats,
	ReviewUpdate,
	uuid,
} from '@/types/main'
import toast from 'react-hot-toast'
import {
	getIndexOfNextAgainCard,
	getIndexOfNextUnreviewedCard,
	useCardIndex,
	useNextValid,
	useReviewActions,
	useReviewStage,
} from './use-review-store'
import { PostgrestError } from '@supabase/supabase-js'
import { mapArray } from '@/lib/utils'

const postReview = async (submitData: ReviewInsert) => {
	const { data } = await supabase
		.rpc('insert_user_card_review', submitData)
		.throwOnError()

	return data
}

const updateReview = async (submitData: ReviewUpdate) => {
	if (!submitData?.review_id || !submitData?.score)
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

export function reviewsQuery(userId: uuid, lang: string, day_session: string) {
	return {
		queryKey: [
			'user',
			lang,
			'review',
			day_session,
			userId,
			'manifest',
		] as readonly string[],
		queryFn: async ({
			queryKey,
		}: {
			queryKey: readonly unknown[]
		}): Promise<DailyReviewStateLoaded | null> => {
			const [, lang, , day_session, uid] = queryKey as string[]
			const { data } = (await supabase
				.from('user_deck_review_state')
				.select('*, user_card_review(*)')
				.match({
					uid,
					lang,
					day_session,
				})
				.throwOnError()
				.maybeSingle()) as { data: DailyReviewStateFetched }
			if (!data || !data.manifest?.length) return null
			const { user_card_review: reviews, ...reviewStateRow } = data

			const reviewsMap: ReviewsMap =
				!reviews?.length ?
					{}
				:	mapArray<ReviewRow, 'phrase_id'>(
						reviews.sort((a, b) =>
							a.created_at === b.created_at ? 0
								// earlier items will come first and be overwritten in the map
							: a.created_at > b.created_at ? 1
							: -1
						),
						'phrase_id'
					)
			return {
				...reviewStateRow,
				reviewsMap,
			} as DailyReviewStateLoaded
		},
	}
}

// does not need to be used inside the review-store context
export function useReviewsToday(lang: string, day_session: string) {
	const { userId: uid } = useAuth()
	return useSuspenseQuery({
		...reviewsQuery(uid!, lang, day_session),
	})
}

const selectStats = (data: DailyReviewStateLoaded | null) =>
	!data ? null : mapToStats(data.reviewsMap, data.manifest)

export function useReviewsTodayStats(lang: string, day_session: string) {
	const { userId: uid } = useAuth()
	return useSuspenseQuery({
		...reviewsQuery(uid!, lang, day_session),
		select: selectStats,
	})
}

const selectManifest = (data: DailyReviewStateLoaded | null) =>
	(data?.manifest as pids) ?? null
export function useManifest(lang: string, day_session: string) {
	const { userId: uid } = useAuth()
	return useSuspenseQuery({
		...reviewsQuery(uid!, lang, day_session),
		select: selectManifest,
	})
}

export function useOneReviewToday(
	lang: string,
	day_session: string,
	pid: uuid
) {
	const { userId } = useAuth()
	const selectReview = useCallback(
		(data: DailyReviewStateLoaded | null) => data?.reviewsMap[pid] ?? null,
		[pid]
	)
	return useQuery({
		...reviewsQuery(userId!, lang, day_session),
		enabled: !!userId && !!pid,
		select: selectReview,
	})
}

export function useReviewMutation(
	pid: uuid,
	lang: string,
	day_session: string,
	resetRevealCard: () => void
) {
	const queryClient = useQueryClient()
	const { userId } = useAuth()
	const currentCardIndex = useCardIndex()
	const { data: prevData } = useOneReviewToday(lang, day_session, pid)
	const stage = useReviewStage()
	const { gotoIndex } = useReviewActions()
	const nextIndex = useNextValid()
	const { data: reviewsData } = useReviewsToday(lang, day_session)
	// this mutation should only be loaded when the manifest is present
	const manifest = reviewsData!.manifest
	return useMutation<ReviewRow, PostgrestError, { score: number }>({
		mutationKey: ['user', lang, 'review', day_session, pid],
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
			// this is done instead of using invalidateQueries... why? IDK.
			// it does ensure that the local cache is updated even when the db
			// data is not changed (e.g. re-reviewing a card)
			queryClient.setQueryData<DailyReviewStateLoaded>(
				['user', lang, 'review', day_session, userId, 'manifest'],
				(oldData): DailyReviewStateLoaded => {
					if (!oldData) throw new Error('No previous data in cache')
					const newMap = { ...oldData.reviewsMap, [pid]: mergedData }
					return {
						...oldData,
						reviewsMap: newMap,
					}
				}
			)

			setTimeout(() => {
				resetRevealCard()
				// if the next is the same as current, it means we're on the final card, which
				// is the only situation where the out-of-date nextIndex needs to be corrected
				if (nextIndex === currentCardIndex && data.score > 1)
					gotoIndex(manifest.length)
				else gotoIndex(nextIndex)
			}, 1000)
		},
		onError: (error) => {
			toast.error(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})
}
