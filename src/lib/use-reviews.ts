import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import supabase from './supabase-client'
import { useAuth } from './hooks'
import {
	DailyCacheKey,
	ReviewInsert,
	ReviewRow,
	ReviewsMap,
	ReviewStateManifestRow,
	ReviewUpdate,
	uuid,
} from '@/types/main'
import toast from 'react-hot-toast'
import { useReviewActions, useReviewStage } from './use-review-store'
import { PostgrestError } from '@supabase/supabase-js'
import { mapArray } from './utils'

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

export function reviewsQuery(userId: uuid, dailyCacheKey: DailyCacheKey) {
	return {
		queryKey: dailyCacheKey,
		queryFn: async (): Promise<ReviewsMap> => {
			const { data } = await supabase
				.from('user_card_review')
				.select()
				.eq('day_session', dailyCacheKey[3])
				.eq('lang', dailyCacheKey[1])
				.eq('uid', userId)
				//.eq('lang', lang)
				.throwOnError()
			const map: ReviewsMap =
				!data || !data.length ?
					{}
				:	mapArray<ReviewRow, 'phrase_id'>(
						data.sort((a, b) =>
							a.created_at === b.created_at ? 0
								// earlier items will come first and be overwritten in the map
							: a.created_at > b.created_at ? 1
							: -1
						),
						'phrase_id'
					)

			return map
		},
	}
}

export function useDailyReviewState(
	uid: uuid,
	lang: string,
	day_session: string
) {
	return useSuspenseQuery({
		queryKey: ['user', lang, 'review', day_session, uid, 'manifest'],
		queryFn: async () =>
			(
				await supabase
					.from('user_deck_review_state')
					.select()
					.match({
						uid,
						lang,
						day_session,
					})
					.throwOnError()
					.maybeSingle()
			).data as ReviewStateManifestRow | null,
		gcTime: Infinity,
		staleTime: Infinity,
		refetchOnMount: true,
		refetchOnReconnect: true,
	})
}

export function useReviewsToday(dailyCacheKey: DailyCacheKey) {
	const { userId } = useAuth()
	return useQuery({
		...reviewsQuery(userId!, dailyCacheKey),
		enabled: !!userId && !!dailyCacheKey,
	})
}

type ReviewStats = {
	reviewed: number
	again: number
}

export function useReviewsTodayStats(dailyCacheKey: DailyCacheKey) {
	const { userId } = useAuth()
	return useSuspenseQuery<ReviewsMap, Error, ReviewStats>({
		...reviewsQuery(userId!, dailyCacheKey),
		select: (data: ReviewsMap): ReviewStats => ({
			reviewed: Object.keys(data).length,
			again: Object.values(data).filter((r) => r.score === 1).length,
		}),
	})
}

export function useOneReviewToday(dailyCacheKey: DailyCacheKey, pid: uuid) {
	const { userId } = useAuth()
	return useQuery({
		...reviewsQuery(userId!, dailyCacheKey),
		enabled: !!userId && !!dailyCacheKey && !!pid,
		select: (data: ReviewsMap) => data[pid],
	})
}

export function useReviewMutation(
	pid: uuid,
	dailyCacheKey: DailyCacheKey,
	resetRevealCard: () => void
) {
	const queryClient = useQueryClient()
	const { data: prevData } = useOneReviewToday(dailyCacheKey, pid)
	const stage = useReviewStage()
	const { gotoNextValid, addReview } = useReviewActions()

	return useMutation<ReviewRow, PostgrestError, { score: number }>({
		mutationKey: [...dailyCacheKey, pid],
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
				lang: dailyCacheKey[1],
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
			// this is done instead of using invalidateQueries... why? IDK.
			// it does ensure that the local cache is updated even when the db
			// data is not changed (e.g. re-reviewing a card)
			queryClient.setQueryData<ReviewsMap>(dailyCacheKey, (oldData) => {
				return { ...oldData, [pid]: mergedData }
			})

			addReview(mergedData)

			setTimeout(() => {
				resetRevealCard()
				gotoNextValid()
			}, 1000)
		},
		onError: (error) => {
			toast.error(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})
}
