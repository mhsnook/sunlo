import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase from '@/lib/supabase-client'
import {
	writeSyncedRow,
	type SyncedCollection,
} from '@/lib/collections/synced-row'
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

/**
 * Fold a table's INSERT and UPDATE frames into its collection.
 *
 * Every table on this channel is one the signed-in user owns, so every binding
 * filters on `uid`. RLS already scopes the stream; the filter lets realtime
 * discard a row before the policy check.
 *
 * No DELETE: Supabase RLS-scopes INSERT and UPDATE frames but broadcasts every
 * DELETE to every subscriber, carrying only the replica identity. See
 * docs/mutations.md.
 */
function bindRows<T extends object, TKey extends string>(
	channel: RealtimeChannel,
	table: string,
	mine: string,
	collection: SyncedCollection<T, TKey>,
	parse: (row: unknown) => T
): RealtimeChannel {
	const handle = (payload: { new: unknown }) => {
		// Ahead of the write's own check, so a route that never loaded this
		// collection doesn't parse frames it will throw away.
		if (!collection.isReady()) return
		writeSyncedRow(collection, parse(payload.new))
	}
	return (['INSERT', 'UPDATE'] as const).reduce(
		(ch, event) =>
			ch.on(
				'postgres_changes',
				{ event, schema: 'public', table, filter: mine },
				handle
			),
		channel
	)
}

// Realtime for the user's own tables: RLS scopes each stream to the
// subscriber, so we fold events straight into their collections. Subscribed in
// the `_user` layout, torn down on sign-out.
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
