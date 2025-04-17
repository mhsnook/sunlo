import { queryOptions } from '@tanstack/react-query'
import supabase from './supabase-client'
import { ReviewInsert, uuid } from '@/types/main'

export const reviewablesQueryOptions = (lang: string, userId: uuid) => {
	// cache-key and shouldn't change with browser settings
	const today = new Date().toLocaleDateString('en-IN')
	return queryOptions({
		queryKey: ['user', userId, lang, 'reviewables', today],
		queryFn: async () =>
			(
				await supabase
					.from('user_card_review_today')
					.select()
					.eq('lang', lang)
					.throwOnError()
			).data,
		staleTime: Infinity,
		refetchInterval: Infinity,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
	})
}

export const postReview = async (submitData: ReviewInsert) => {
	if (!submitData?.user_card_id || !submitData?.score)
		throw new Error('Invalid review; cannot log')

	const { data } = await supabase
		.rpc('insert_user_card_review', submitData)
		.throwOnError()

	return data
}
