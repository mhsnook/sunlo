import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { FeedActivitySchema, type LangType } from '@/lib/schemas'

export const FEED_QUERY_KEY = ['feed']

export function useFeedLang(lang: LangType) {
	return useInfiniteQuery({
		queryKey: ['feed', lang],
		queryFn: async ({ pageParam }) => {
			let query = supabase
				.from('feed_activities')
				.select('*')
				.eq('lang', lang)
				.order('created_at', { ascending: false })
				.limit(20)

			if (pageParam) {
				query = query.lt('created_at', pageParam)
			}

			const { data, error } = await query

			if (error) throw error
			return data.map((item) => FeedActivitySchema.parse(item))
		},
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => {
			if (lastPage.length < 20) return null
			return lastPage[lastPage.length - 1].created_at
		},
		refetchOnMount: true,
	})
}

export function useInvalidateFeed() {
	const queryClient = useQueryClient()
	return (lang?: string) => {
		void queryClient.resetQueries({
			queryKey: lang ? [...FEED_QUERY_KEY, lang] : FEED_QUERY_KEY,
		})
	}
}
