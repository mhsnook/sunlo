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
	commentUpvotesCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import { notificationsCollection } from '@/features/notifications/collections'
import { queryClient } from '@/lib/query-client'
import { resetUiPrefs } from '@/lib/ui-prefs'
import { clearPersistedUserData } from '@/lib/collections/local-cache'
import { should } from '@scenetest/checks-react'

export const clearUser = async () => {
	console.log('Identity change: clearing user collections and local cache')
	resetUiPrefs()

	// Synchronously drop user-scoped RQ cache entries up front. cleanup()
	// below also calls removeQueries but does so behind an un-awaited
	// promise — clearing here plugs that race against the next preload().
	queryClient.removeQueries({ queryKey: ['user'] })

	// cleanup() (not refetch): refetch would leave each collection in
	// `ready` with [], silently short-circuiting the next preload() and
	// rendering empty UI on re-login. cleanup() flips status to
	// `cleaned-up` so the next access restarts sync and fetches fresh.
	// commentsCollection / commentPhraseLinksCollection are public — their
	// rows stay valid for a logged-out viewer, so leave them alone.
	await Promise.all([
		myProfileCollection.cleanup(),
		decksCollection.cleanup(),
		cardsCollection.cleanup(),
		reviewDaysCollection.cleanup(),
		cardReviewsCollection.cleanup(),
		friendSummariesCollection.cleanup(),
		chatMessagesCollection.cleanup(),
		commentUpvotesCollection.cleanup(),
		phraseRequestUpvotesCollection.cleanup(),
		phrasePlaylistUpvotesCollection.cleanup(),
		notificationsCollection.cleanup(),
	])

	// confirm-quit phase: drop the localStorage sidecar cache too.
	clearPersistedUserData()

	// Confirm sign-out returned every user-scoped collection to a neutral
	// (empty) state. Stripped from production by the Vite plugin.
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
		'all user-scoped collections are empty after identity change',
		Object.values(userCollectionSizes).every((n) => n === 0),
		userCollectionSizes
	)
}
