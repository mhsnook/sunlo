import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query'
import { useLiveQuery, eq } from '@tanstack/react-db'
import supabase from '@/lib/supabase-client'
import { FeedActivitySchema, type FeedActivityType } from './schemas'
import type { LangType } from '@/features/languages/schemas'
import { friendSummariesCollection } from '@/features/social/collections'

export type FeedFilterType = 'request' | 'playlist' | 'phrase'

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

// Filtered feed: fetches only items of a specific type for backfill when filter is active
export function useFilteredFeedLang(
	lang: LangType,
	filterType: FeedFilterType | undefined
) {
	return useInfiniteQuery({
		queryKey: ['feed', lang, 'filtered', filterType],
		queryFn: async ({ pageParam }) => {
			let query = supabase
				.from('feed_activities')
				.select('*')
				.eq('lang', lang)
				.eq('type', filterType!)
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
		enabled: !!filterType,
	})
}

// Get connected friend UIDs from the local collection
export function useFriendUids() {
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

// Filtered friends feed: backfill for a specific type when filter is active
export function useFilteredFriendsFeedLang(
	lang: LangType,
	filterType: FeedFilterType | undefined,
	friendUids: Array<string>
) {
	return useInfiniteQuery({
		queryKey: ['feed', 'friends', lang, 'filtered', filterType, friendUids],
		queryFn: async ({ pageParam }) => {
			if (friendUids.length === 0) return []

			let query = supabase
				.from('feed_activities')
				.select('*')
				.eq('lang', lang)
				.eq('type', filterType!)
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
		enabled: !!filterType && friendUids.length > 0,
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
				.gt('popularity', 2)
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

// Filtered popular feed: backfill for a specific type when filter is active
export function useFilteredPopularFeedLang(
	lang: LangType,
	filterType: FeedFilterType | undefined
) {
	return useInfiniteQuery({
		queryKey: ['feed', 'popular', lang, 'filtered', filterType],
		queryFn: async ({ pageParam }) => {
			let query = supabase
				.from('feed_activities')
				.select('*')
				.eq('lang', lang)
				.eq('type', filterType!)
				.gt('popularity', 2)
				.order('popularity', { ascending: false })
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
		enabled: !!filterType,
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

/**
 * Recent friend activity across every language. Returns the most
 * recent `windowSize` rows from connected friends so callers can
 * group by friend client-side for compact dashboard displays.
 * Returns an empty list when the user has no friends connected.
 */
export function useRecentFriendsActivity(windowSize = 25) {
	const { data: friends } = useFriendUids()
	const friendUids = friends?.map((f) => f.uid) ?? []

	return useQuery({
		queryKey: ['feed', 'friends', 'recent', windowSize, friendUids],
		queryFn: async (): Promise<Array<FeedActivityType>> => {
			if (friendUids.length === 0) return []
			const { data, error } = await supabase
				.from('feed_activities')
				.select('*')
				.in('uid', friendUids)
				.order('created_at', { ascending: false })
				.limit(windowSize)
			if (error) throw error
			return data.map((item) => FeedActivitySchema.parse(item))
		},
		enabled: friends !== undefined,
		staleTime: 60_000,
	})
}
