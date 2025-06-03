import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import supabase from './supabase-client'
import { useAuth } from './hooks'
import {
	DailyCacheKey,
	ReviewInsert,
	ReviewRow,
	ReviewUpdate,
	uuid,
} from '@/types/main'
import toast from 'react-hot-toast'
import { useReviewState } from './use-reviewables'
import { PostgrestError } from '@supabase/supabase-js'

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

function reviewsQuery(
	//lang: string,
	userId: uuid,
	dailyCacheKey: DailyCacheKey
) {
	return {
		queryKey: dailyCacheKey,
		queryFn: async () => {
			const { data } = await supabase
				.from('user_card_review')
				.select()
				.eq('day_session', dailyCacheKey[3])
				.eq('lang', dailyCacheKey[1])
				.eq('uid', userId)
				//.eq('lang', lang)
				.throwOnError()
			return data || []
		},
	}
}

export function useReviewsToday(dailyCacheKey: DailyCacheKey) {
	const { userId } = useAuth()
	return useQuery({
		...reviewsQuery(userId!, dailyCacheKey),
		enabled: !!userId,
	})
}

export function useOneReviewToday(dailyCacheKey: DailyCacheKey, pid: uuid) {
	const { userId } = useAuth()
	return useQuery({
		...reviewsQuery(userId!, dailyCacheKey),
		enabled: !!userId,
		select: (data) => data.find((review) => review.phrase_id === pid) || null,
	})
}

export function useReviewMutation(
	pid: uuid,
	dailyCacheKey: DailyCacheKey,
	proceed: () => void,
	resetRevealCard: () => void
) {
	const queryClient = useQueryClient()
	const { data: prevData } = useOneReviewToday(dailyCacheKey, pid)
	const { data: state } = useReviewState(dailyCacheKey)

	return useMutation<ReviewRow, PostgrestError, { score: number }>({
		mutationKey: [...dailyCacheKey, pid],
		// @ts-expect-error ts-2322 -- because Supabase view fields are always | null
		mutationFn: async ({ score }: { score: number }) => {
			// We want 1 mutation per day per card. We can send a second mutation
			// only during stage 1 or 2, to _correct_ an improper input.

			// no mutations when re-reviewing incorrect
			if (state.reviewStage > 3)
				return {
					...prevData,
					score,
				}

			// during stages 1 and 2 send an update only if the score has changed
			if (prevData?.score === score) return prevData
			if (prevData?.id)
				return await updateReview({
					score,
					review_id: prevData.id,
				})

			// standard case: card has not been reviewed today
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
			queryClient.setQueryData<Array<ReviewRow>>(dailyCacheKey, (oldData) => {
				return [...(oldData ?? []), mergedData]
			})
			/*queryClient.invalidateQueries({
				queryKey: dailyCacheKey,
			})*/
			setTimeout(() => {
				resetRevealCard()
				proceed()
			}, 1000)
		},
		onError: (error) => {
			toast.error(`There was an error posting your review: ${error.message}`)
			console.log(`Error posting review:`, error)
		},
	})
}
