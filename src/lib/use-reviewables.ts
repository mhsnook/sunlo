import { queryOptions } from '@tanstack/react-query'
import supabase from './supabase-client'
import { uuid } from '@/types/main'

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
