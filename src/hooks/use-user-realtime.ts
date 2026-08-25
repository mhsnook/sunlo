import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import supabase from '@/lib/supabase-client'
import {
	deleteSyncedRow,
	writeRealtimeRow,
} from '@/lib/collections/realtime-row'
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
import { DeckSchema } from '@/features/deck/schemas'
import { decksCollection } from '@/features/deck/collections'

// The upvote tables soft-delete, so un-upvoting arrives as an UPDATE carrying
// `deleted: true`, not as a DELETE. That matters: Supabase RLS-scopes INSERT
// and UPDATE frames but broadcasts every DELETE to every subscriber, so the
// old DELETE binding dropped this user's own upvote when a stranger un-upvoted
// the same request (#768). See docs/mutations.md.
function bindUpvote(
	channel: RealtimeChannel,
	table: string,
	keyField: string,
	onUpvote: (row: Record<string, unknown>) => void,
	onUnUpvote: (key: string) => void
): RealtimeChannel {
	const handle = (payload: { new: Record<string, unknown> }) => {
		const row = payload.new
		const key = row[keyField]
		if (typeof key !== 'string') return
		if (row.deleted === true) onUnUpvote(key)
		else onUpvote(row)
	}
	return channel
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table },
			handle
		)
		.on(
			'postgres_changes',
			{ event: 'UPDATE', schema: 'public', table },
			handle
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
			(row) => {
				const upvote = PhraseRequestUpvoteSchema.parse(row)
				writeRealtimeRow(
					phraseRequestUpvotesCollection,
					upvote.request_id,
					upvote
				)
			},
			(key) => deleteSyncedRow(phraseRequestUpvotesCollection, key)
		)

		channel = bindUpvote(
			channel,
			'comment_upvote',
			'comment_id',
			(row) => {
				const upvote = CommentUpvoteSchema.parse(row)
				writeRealtimeRow(commentUpvotesCollection, upvote.comment_id, upvote)
			},
			(key) => deleteSyncedRow(commentUpvotesCollection, key)
		)

		channel = bindUpvote(
			channel,
			'phrase_playlist_upvote',
			'playlist_id',
			(row) => {
				const upvote = PhrasePlaylistUpvoteSchema.parse(row)
				writeRealtimeRow(
					phrasePlaylistUpvotesCollection,
					upvote.playlist_id,
					upvote
				)
			},
			(key) => deleteSyncedRow(phrasePlaylistUpvotesCollection, key)
		)

		// No DELETE binding: the replica identity is the `id` primary key while
		// this collection keys on `lang`, so a DELETE frame carries nothing we
		// can map to a key. Nothing deletes a deck anyway — archiving is UPDATE.
		channel = channel
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'user_deck' },
				(payload) =>
					decksCollection.utils.writeUpsert(DeckSchema.parse(payload.new))
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'user_deck' },
				(payload) =>
					decksCollection.utils.writeUpsert(DeckSchema.parse(payload.new))
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
