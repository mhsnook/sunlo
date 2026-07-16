import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase from '@/lib/supabase-client'
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

// DELETE payloads carry only the replica identity (the composite PK), which
// includes the FK we key on.
function bindUpvote(
	channel: RealtimeChannel,
	table: string,
	keyField: string,
	onUpsert: (row: Record<string, unknown>) => void,
	onDelete: (key: string) => void
): RealtimeChannel {
	return channel
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table },
			(payload) => onUpsert(payload.new)
		)
		.on(
			'postgres_changes',
			{ event: 'DELETE', schema: 'public', table },
			(payload) => {
				const key = (payload.old as Record<string, unknown>)[keyField]
				if (typeof key === 'string') onDelete(key)
			}
		)
}

// Realtime for the user's own tables (#723): RLS scopes each stream to the
// subscriber, so we fold events straight into their collections. Subscribed in
// the `_user` layout, torn down on sign-out.
export const useUserRealtime = () => {
	const userId = useUserId()

	useEffect(() => {
		if (!userId) return

		let channel = supabase.channel('user-tables-realtime')

		channel = bindUpvote(
			channel,
			'phrase_request_upvote',
			'request_id',
			(row) =>
				phraseRequestUpvotesCollection.utils.writeUpsert(
					PhraseRequestUpvoteSchema.parse(row)
				),
			(key) => phraseRequestUpvotesCollection.utils.writeDelete(key)
		)

		channel = bindUpvote(
			channel,
			'comment_upvote',
			'comment_id',
			(row) =>
				commentUpvotesCollection.utils.writeUpsert(
					CommentUpvoteSchema.parse(row)
				),
			(key) => commentUpvotesCollection.utils.writeDelete(key)
		)

		channel = bindUpvote(
			channel,
			'phrase_playlist_upvote',
			'playlist_id',
			(row) =>
				phrasePlaylistUpvotesCollection.utils.writeUpsert(
					PhrasePlaylistUpvoteSchema.parse(row)
				),
			(key) => phrasePlaylistUpvotesCollection.utils.writeDelete(key)
		)

		// Reviews: append-only INSERTs plus rare correction UPDATEs (#724).
		channel = channel
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'user_card_review' },
				(payload) =>
					cardReviewsCollection.utils.writeUpsert(
						CardReviewSchema.parse(payload.new)
					)
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'user_card_review' },
				(payload) =>
					cardReviewsCollection.utils.writeUpsert(
						CardReviewSchema.parse(payload.new)
					)
			)

		// Review session (immutable, INSERT-only) + its append-only milestone log.
		channel = channel
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'user_review_session' },
				(payload) =>
					reviewSessionsCollection.utils.writeUpsert(
						ReviewSessionSchema.parse(payload.new)
					)
			)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'user_review_milestone' },
				(payload) =>
					reviewMilestonesCollection.utils.writeUpsert(
						ReviewMilestoneSchema.parse(payload.new)
					)
			)

		channel.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [userId])
}
