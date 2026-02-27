import { myProfileCollection } from './auth'
import { decksCollection, cardsCollection } from './deck'
import { cardReviewsCollection, reviewDaysCollection } from './review'
import { friendSummariesCollection, chatMessagesCollection } from './social'
import {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
} from './comments'
import { phraseRequestUpvotesCollection } from './requests'
import { phrasePlaylistUpvotesCollection } from './playlists'
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
