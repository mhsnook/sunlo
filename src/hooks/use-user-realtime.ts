import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Tables } from '@/types/supabase'
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
import { DeckMetaSchema, CardMetaSchema } from '@/features/deck/schemas'
import { decksCollection, cardsCollection } from '@/features/deck/collections'
import languages from '@/lib/languages'

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

// decksCollection / cardsCollection read the `user_deck_plus` / `user_card_plus`
// views, but realtime delivers base-table rows. The views add columns the base
// event can't carry — deck aggregates (card counts, review stats) and card FSRS
// (last_reviewed_at/difficulty/stability, joined off user_card_review). So we
// patch only the base columns onto an existing row (preserving the computed
// ones) and fall back to a schema-defaulted insert for rows we've never seen —
// a brand-new deck (no cards yet) or card (no reviews yet), where the computed
// columns are genuinely 0/null anyway.
function upsertDeckFromBase(base: Tables<'user_deck'>) {
	const parsed = DeckMetaSchema.parse({
		...base,
		language: languages[base.lang] ?? base.lang,
	})
	const existing = decksCollection.get(base.lang)
	if (!existing) {
		decksCollection.utils.writeInsert(parsed)
		return
	}
	// Keep the view-computed aggregates from the row we already have; only the
	// base columns changed.
	decksCollection.utils.writeUpsert({
		...parsed,
		cards_active: existing.cards_active,
		cards_learned: existing.cards_learned,
		cards_skipped: existing.cards_skipped,
		count_reviews_7d: existing.count_reviews_7d,
		count_reviews_7d_positive: existing.count_reviews_7d_positive,
		lang_total_phrases: existing.lang_total_phrases,
		most_recent_review_at: existing.most_recent_review_at,
	})
}

function upsertCardFromBase(base: Tables<'user_card'>) {
	const parsed = CardMetaSchema.parse(base)
	const existing = cardsCollection.get(base.id)
	if (!existing) {
		cardsCollection.utils.writeInsert(parsed)
		return
	}
	// Keep the FSRS columns from the row we already have (they're joined off
	// user_card_review, absent from the base event); only the base columns
	// (status, direction, …) changed.
	cardsCollection.utils.writeUpsert({
		...parsed,
		last_reviewed_at: existing.last_reviewed_at,
		difficulty: existing.difficulty,
		stability: existing.stability,
	})
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

		// user_deck: INSERT (new deck) + UPDATE (archive, goal, prefs). No DELETE
		// binding — the DELETE payload carries only the PK (`id`), which the
		// lang-keyed collection doesn't store, and decks are archived (an UPDATE),
		// never hard-deleted, in normal use.
		channel = channel
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'user_deck' },
				(payload) => upsertDeckFromBase(payload.new as Tables<'user_deck'>)
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'user_deck' },
				(payload) => upsertDeckFromBase(payload.new as Tables<'user_deck'>)
			)

		// user_card: INSERT (card added elsewhere / by an RPC side effect) +
		// UPDATE (status, direction) + DELETE. The card PK is `id`, which is the
		// collection key, so the PK-only DELETE payload maps cleanly.
		channel = channel
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'user_card' },
				(payload) => upsertCardFromBase(payload.new as Tables<'user_card'>)
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'user_card' },
				(payload) => upsertCardFromBase(payload.new as Tables<'user_card'>)
			)
			.on(
				'postgres_changes',
				{ event: 'DELETE', schema: 'public', table: 'user_card' },
				(payload) => {
					const id = (payload.old as Partial<Tables<'user_card'>>).id
					if (typeof id === 'string' && cardsCollection.has(id))
						cardsCollection.utils.writeDelete(id)
				}
			)

		channel.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [userId])
}
