import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import supabase from './supabase-client'
import { useAuth } from './hooks'
import {
	DailyCacheKey,
	ReviewInsert,
	ReviewRow,
	ReviewsLoaded,
	ReviewsMap,
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

export function reviewsMapToLoaded(map: ReviewsMap): ReviewsLoaded {
	return {
		map,
		totalReviewed: Object.keys(map).length,
		totalAgain: Object.values(map).filter((r) => r.score === 1).length,
	}
}

export function reviewsQuery(userId: uuid, dailyCacheKey: DailyCacheKey) {
	return {
		queryKey: dailyCacheKey,
		queryFn: async (): Promise<ReviewsLoaded> => {
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

			return reviewsMapToLoaded(map)
		},
	}
}

export function useReviewsToday(dailyCacheKey: DailyCacheKey) {
	const { userId } = useAuth()
	return useQuery({
		...reviewsQuery(userId!, dailyCacheKey),
		enabled: !!userId && !!dailyCacheKey,
	})
}

export function useOneReviewToday(dailyCacheKey: DailyCacheKey, pid: uuid) {
	const { userId } = useAuth()
	return useQuery({
		...reviewsQuery(userId!, dailyCacheKey),
		enabled: !!userId && !!dailyCacheKey && !!pid,
		select: (data: ReviewsLoaded) => data.map[pid],
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
	const { gotoNextValid } = useReviewActions()

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
			queryClient.setQueryData<ReviewsLoaded>(dailyCacheKey, (oldData) => {
				return reviewsMapToLoaded({ ...oldData?.map, [pid]: mergedData })
			})

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
