import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery, eq } from '@tanstack/react-db'
import supabase from '@/lib/supabase-client'
import { FeedActivitySchema, type LangType } from '@/lib/schemas'
import { friendSummariesCollection } from '@/lib/collections'

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

// Get connected friend UIDs from the local collection
function useFriendUids() {
	return useLiveQuery(
		(q) =>
			q
				.from({ friend: friendSummariesCollection })
				.where(({ friend }) => eq(friend.status, 'friends'))
				.select(({ friend }) => ({ uid: friend.uid })),
		[]
	)
}

// Friends feed: shows activities from the user's connected friends
export function useFriendsFeedLang(lang: LangType) {
	const { data: friends } = useFriendUids()
	const friendUids = friends?.map((f) => f.uid) ?? []

	return useInfiniteQuery({
		queryKey: ['feed', 'friends', lang, friendUids],
		queryFn: async ({ pageParam }) => {
			// If no friends, return empty
			if (friendUids.length === 0) {
				return []
			}

			let query = supabase
				.from('feed_activities')
				.select('*')
				.eq('lang', lang)
				.in('uid', friendUids)
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
		// Only enable when we have friend data loaded
		enabled: friends !== undefined,
	})
}

// Popular feed: shows activities ordered by popularity (highest first)
// - Requests and playlists use upvote_count
// - Phrases use count_learners
export function usePopularFeedLang(lang: LangType) {
	return useInfiniteQuery({
		queryKey: ['feed', 'popular', lang],
		queryFn: async ({ pageParam }) => {
			// Order by popularity descending, then by created_at as tiebreaker
			let query = supabase
				.from('feed_activities')
				.select('*')
				.eq('lang', lang)
				.order('popularity', { ascending: false })
				.order('created_at', { ascending: false })
				.limit(20)

			if (pageParam) {
				// For pagination with popularity ordering, we need composite cursor
				// Using created_at as secondary sort maintains stability
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
