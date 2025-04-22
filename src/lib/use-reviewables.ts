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
		queryFn: ({ queryKey }): pids | null => {
			const data = localStorage.getItem(JSON.stringify(queryKey))
			console.log(
				`We went to localstorage and this is what we found: for `,
				queryKey,
				data
			)
			return data ? JSON.parse(data) : null
		},
		gcTime: 120_000,
		staleTime: 1_200_000,
	})
}

export function getIndexOfFirstUnreviewedCard(
	pids: Array<string>,
	key: Array<any>
) {
	const res = pids.findIndex((pid) => {
		const res = localStorage.getItem(JSON.stringify([...key, pid]))
		console.log(res, typeof res)
		return typeof res !== 'string'
	})
	return res === -1 ? pids.length : res
}
