import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	DeckMetaSchema,
	type DeckMetaType,
	CardMetaSchema,
	type CardMetaType,
} from './schemas'
import { decksQuery, cardsQuery } from './queries'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export { decksQuery, cardsQuery }

export const decksCollection = createCollection(
	queryCollectionOptions({
		id: 'decks',
		queryKey: decksQuery.queryKey,
		queryFn: decksQuery.queryFn!,
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		startSync: false,
		schema: DeckMetaSchema,
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('user_deck')
						.update(m.changes)
						.eq('uid', m.original.uid)
						.eq('lang', m.original.lang)
						.throwOnError()
				)
			)
			return { refetch: false }
		},
	})
)

export const cardsCollection = createCollection(
	queryCollectionOptions({
		id: 'cards',
		queryKey: cardsQuery.queryKey,
		queryFn: cardsQuery.queryFn!,
		getKey: (item: CardMetaType) => item.id,
		queryClient,
		startSync: false,
		schema: CardMetaSchema,
		onInsert: async ({ transaction }) => {
			// Only the user_card columns — the rest of CardMetaSchema (last_reviewed_at,
			// difficulty, stability) lives in user_card_plus via the user_card_review
			// join, not on the underlying table. { refetch: false } because our
			// optimistic row already carries the same column values we send.
			await supabase
				.from('user_card')
				.insert(
					transaction.mutations.map((m) => ({
						id: m.modified.id,
						uid: m.modified.uid,
						phrase_id: m.modified.phrase_id,
						lang: m.modified.lang,
						status: m.modified.status,
						direction: m.modified.direction,
						created_at: m.modified.created_at,
						updated_at: m.modified.updated_at,
					}))
				)
				.throwOnError()
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			// Throwing rolls the optimistic state back. { refetch: false } keeps
			// the confirmed value locally instead of reloading user_card_plus —
			// safe because user_card has no triggers that change other columns.
			await Promise.all(
				transaction.mutations.map((m) =>
					supabase
						.from('user_card')
						.update(m.changes)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			return { refetch: false }
		},
	})
)
