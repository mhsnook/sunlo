import { useEffect } from 'react'
import supabase from '@/lib/supabase-client'
import { bindRows } from '@/lib/collections/realtime'
import { useUserId } from '@/lib/use-auth'
import {
	PhraseRequestUpvoteSchema,
	CommentUpvoteSchema,
} from '@/features/requests/schemas'
import {
	phraseRequestUpvotesCollection,
	commentUpvotesCollection,
} from '@/features/requests/collections'
import { PhrasePlaylistUpvoteSchema } from '@/features/playlists/schemas'
import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import {
	CardReviewSchema,
	ReviewSessionSchema,
	ReviewMilestoneSchema,
} from '@/features/review/schemas'
import {
	cardReviewsCollection,
	reviewSessionsCollection,
	reviewMilestonesCollection,
} from '@/features/review/collections'
import { DeckSchema, CardSchema } from '@/features/deck/schemas'
import { decksCollection, cardsCollection } from '@/features/deck/collections'
import { MyProfileSchema } from '@/features/profile/schemas'
import { myProfileCollection } from '@/features/profile/collections'

// Realtime for the user's own tables: every binding filters on `uid`, and
// RLS scopes each stream to the subscriber, so we fold events straight into
// their collections. Subscribed in the `_user` layout, torn down on sign-out.
export const useUserRealtime = () => {
	const userId = useUserId()

	useEffect(() => {
		if (!userId) return

		const mine = `uid=eq.${userId}`
		let channel = supabase.channel('user-tables-realtime')

		channel = bindRows(
			channel,
			'phrase_request_upvote',
			mine,
			phraseRequestUpvotesCollection,
			(row) => PhraseRequestUpvoteSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'comment_upvote',
			mine,
			commentUpvotesCollection,
			(row) => CommentUpvoteSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'phrase_playlist_upvote',
			mine,
			phrasePlaylistUpvotesCollection,
			(row) => PhrasePlaylistUpvoteSchema.parse(row)
		)

		channel = bindRows(channel, 'user_deck', mine, decksCollection, (row) =>
			DeckSchema.parse(row)
		)
		channel = bindRows(channel, 'user_card', mine, cardsCollection, (row) =>
			CardSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'user_card_review',
			mine,
			cardReviewsCollection,
			(row) => CardReviewSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'user_review_session',
			mine,
			reviewSessionsCollection,
			(row) => ReviewSessionSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'user_review_milestone',
			mine,
			reviewMilestonesCollection,
			(row) => ReviewMilestoneSchema.parse(row)
		)
		channel = bindRows(
			channel,
			'user_profile',
			mine,
			myProfileCollection,
			(row) => MyProfileSchema.parse(row)
		)

		channel.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [userId])
}
