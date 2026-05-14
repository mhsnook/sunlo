import { queryClient } from '@/lib/query-client'
import { resetUiPrefs } from '@/lib/ui-prefs'

export const clearUser = async () => {
	resetUiPrefs()

	// Lazy-load every user collection so signed-out visitors never pay the
	// @tanstack/db weight. Refetch (don't cleanup) post-logout: with no JWT,
	// RLS returns empty and the collection clears, and any active live
	// queries simply see rows removed. Calling .cleanup() instead would fire
	// a 'cleaned-up' status event that every subscribed live query logs as
	// an error — many components (NavUser, etc.) call useProfile()
	// unconditionally so subscribers persist even after the auth state changes.
	const [
		{ myProfileCollection },
		{ decksCollection, cardsCollection },
		{ cardReviewsCollection, reviewDaysCollection },
		{ friendSummariesCollection, chatMessagesCollection },
		{
			commentsCollection,
			commentPhraseLinksCollection,
			commentUpvotesCollection,
		},
		{ phraseRequestUpvotesCollection },
		{ phrasePlaylistUpvotesCollection },
		{ notificationsCollection },
	] = await Promise.all([
		import('@/features/profile/collections'),
		import('@/features/deck/collections'),
		import('@/features/review/collections'),
		import('@/features/social/collections'),
		import('@/features/comments/collections'),
		import('@/features/requests/collections'),
		import('@/features/playlists/collections'),
		import('@/features/notifications/collections'),
	])

	await Promise.all([
		myProfileCollection.utils.refetch(),
		decksCollection.utils.refetch(),
		cardsCollection.utils.refetch(),
		reviewDaysCollection.utils.refetch(),
		cardReviewsCollection.utils.refetch(),
		friendSummariesCollection.utils.refetch(),
		chatMessagesCollection.utils.refetch(),
		commentsCollection.utils.refetch(),
		commentPhraseLinksCollection.utils.refetch(),
		commentUpvotesCollection.utils.refetch(),
		phraseRequestUpvotesCollection.utils.refetch(),
		phrasePlaylistUpvotesCollection.utils.refetch(),
		notificationsCollection.utils.refetch(),
	])

	// Also clear React Query cache for user queries to prevent stale data
	// from showing after sign out (e.g., avatar on home page)
	queryClient.removeQueries({ queryKey: ['user'] })
}
