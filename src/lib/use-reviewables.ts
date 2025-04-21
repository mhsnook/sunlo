import { queryOptions } from '@tanstack/react-query'
import supabase from './supabase-client'
import { pids, ReviewInsert } from '@/types/main'

export const postReview = async (submitData: ReviewInsert) => {
	if (!submitData?.user_card_id || !submitData?.score)
		throw new Error('Invalid review; cannot log')

	const { data } = await supabase
		.rpc('insert_user_card_review', submitData)
		.throwOnError()

	return data
}

export function todaysReviewLocalStorageQueryOptions(
	lang: string,
	dayString: string
) {
	return queryOptions({
		queryKey: ['user', lang, 'review', dayString],
		queryFn: ({ queryKey }): pids => {
			const data = JSON.parse(
				localStorage.getItem(`user-${lang}-review-${dayString}`) ?? '[]'
			)
			console.log(
				`We went to localstorage and this is what we found: for `,
				queryKey,
				data
			)
			return data
		},
	})
}
