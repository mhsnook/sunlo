import { myProfileCollection } from '@/features/profile/collections'
import { decksCollection, cardsCollection } from '@/features/deck/collections'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import {
	friendSummariesCollection,
	chatMessagesCollection,
} from '@/features/social/collections'
import {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
} from '@/features/comments/collections'
import { phraseRequestUpvotesCollection } from '@/features/requests/collections'
import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import { notificationsCollection } from '@/features/notifications/collections'
import { queryClient } from '@/lib/query-client'

export const clearUser = async () => {
	// Refetch (don't cleanup) each user collection. Post-logout the client has
	// no JWT so RLS returns empty, the collection clears, and any active live
	// queries simply see rows removed. Calling .cleanup() instead would fire
	// a 'cleaned-up' status event that every subscribed live query logs as an
	// error — many components (NavUser, etc.) call useProfile() unconditionally
	// so subscribers persist even after the auth state changes.
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
