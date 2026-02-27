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
import { queryClient } from '@/lib/query-client'

export const clearUser = async () => {
	// Clean up all user collections
	await Promise.all([
		myProfileCollection.cleanup(),
		decksCollection.cleanup(),
		cardsCollection.cleanup(),
		reviewDaysCollection.cleanup(),
		cardReviewsCollection.cleanup(),
		friendSummariesCollection.cleanup(),
		chatMessagesCollection.cleanup(),
		commentsCollection.cleanup(),
		commentPhraseLinksCollection.cleanup(),
		commentUpvotesCollection.cleanup(),
		phraseRequestUpvotesCollection.cleanup(),
		phrasePlaylistUpvotesCollection.cleanup(),
	])

	// Also clear React Query cache for user queries to prevent stale data
	// from showing after sign out (e.g., avatar on home page)
	queryClient.removeQueries({ queryKey: ['user'] })
}
