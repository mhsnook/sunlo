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
} from '@/features/requests/collections'
import { phraseRequestUpvotesCollection } from '@/features/requests/collections'
import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import { notificationsCollection } from '@/features/notifications/collections'
import { queryClient } from '@/lib/query-client'
import { resetUiPrefs } from '@/lib/ui-prefs'
import { clearPersistedUserData } from '@/lib/collections/local-cache'
import { should } from '@scenetest/checks-react'

export const clearUser = async () => {
	console.log('Sign-out: clearing user collections and local cache')
	resetUiPrefs()

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

	// confirm-quit phase: drop the localStorage sidecar cache too.
	clearPersistedUserData()

	// Confirm logout returned every user-scoped collection to a neutral
	// (empty) state. commentsCollection / commentPhraseLinksCollection are
	// public, so they keep their rows and are deliberately excluded.
	// Stripped from production by the Vite plugin.
	const userCollectionSizes = {
		myProfile: myProfileCollection.toArray.length,
		decks: decksCollection.toArray.length,
		cards: cardsCollection.toArray.length,
		reviewDays: reviewDaysCollection.toArray.length,
		cardReviews: cardReviewsCollection.toArray.length,
		friendSummaries: friendSummariesCollection.toArray.length,
		chatMessages: chatMessagesCollection.toArray.length,
		commentUpvotes: commentUpvotesCollection.toArray.length,
		phraseRequestUpvotes: phraseRequestUpvotesCollection.toArray.length,
		phrasePlaylistUpvotes: phrasePlaylistUpvotesCollection.toArray.length,
		notifications: notificationsCollection.toArray.length,
	}
	should(
		'all user-scoped collections are empty after logout',
		Object.values(userCollectionSizes).every((n) => n === 0),
		userCollectionSizes
	)
}
