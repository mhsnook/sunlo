import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	DeckMetaRawSchema,
	DeckMetaSchema,
	type DeckMetaType,
	CardMetaSchema,
	type CardMetaType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import { sortDecksByCreation } from '@/lib/utils'
import { themes } from '@/lib/deck-themes'
import languages from '@/lib/languages'

export const decksCollection = createCollection(
	queryCollectionOptions({
		id: 'decks',
		queryKey: ['user', 'deck_plus'],
		queryFn: async () => {
			console.log(`Loading decksCollection`)
			const { data } = await supabase
				.from('user_deck_plus')
				.select()
				.throwOnError()
			return (
				data
					?.map((item) => DeckMetaRawSchema.parse(item))
					.toSorted(sortDecksByCreation)
					.map((d, i) =>
						Object.assign(d, {
							theme: i % themes.length,
							language: languages[d.lang],
						})
					) ?? []
			)
		},
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		startSync: false,
		schema: DeckMetaSchema,
	})
)

export const cardsCollection = createCollection(
	queryCollectionOptions({
		id: 'cards',
		queryKey: ['user', 'card'],
		queryFn: async () => {
			console.log(`Loading cardsCollection`)
			const { data } = await supabase
				.from('user_card_plus')
				.select()
				.throwOnError()
			return data?.map((item) => CardMetaSchema.parse(item)) ?? []
		},
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
