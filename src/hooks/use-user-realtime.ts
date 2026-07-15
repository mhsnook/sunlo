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
	DailyReviewStateSchema,
	ReviewMilestoneSchema,
} from '@/features/review/schemas'
import {
	cardReviewsCollection,
	reviewDaysCollection,
	reviewMilestonesCollection,
} from '@/features/review/collections'

/**
 * Bind an upvote table to its collection. Upvotes toggle: INSERT when the
 * user (or a server-side trigger/RPC on their behalf) likes something, DELETE
 * when they unlike. RLS scopes the stream to the subscriber's own rows, so no
 * `filter` is needed — this only ever syncs *your* upvotes across your devices
 * (public `upvote_count` aggregates are a separate, content-sync concern).
 *
 * DELETE payloads carry only the replica-identity columns (the composite PK),
 * which includes the FK we key on — a tolerant remove-if-present.
 */
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

/**
 * Colocated realtime bindings for the user-specific tables (#723). Subscribed
 * once in the `_user` layout and torn down on sign-out (when `userId` clears).
 * Each event is Zod-parsed and folded straight into its collection, so server
 * side-effects (triggers, RPC writes, another device) arrive on their own and
 * we stop asking the server questions we can answer locally.
 */
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

		// Reviews (#724 made this the easy case): an append-only INSERT stream,
		// plus the rare correction UPDATE when a scoring-pass answer is amended.
		// `writeUpsert` folds both, and makes our own optimistic ack-echo a no-op.
		// Reviews are never deleted, so there's no DELETE binding.
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

		// Daily review state: the session row is immutable (manifest, written once
		// at session creation), so INSERT is the only event — a session started on
		// one device shows up on another.
		channel = channel.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'user_deck_review_state' },
			(payload) =>
				reviewDaysCollection.utils.writeUpsert(
					DailyReviewStateSchema.parse(payload.new)
				)
		)

		// Review milestones: the append-only progress log. Each stage transition is
		// a new row; the newest milestone's stage is the session's current stage.
		channel = channel.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'review_milestone' },
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
