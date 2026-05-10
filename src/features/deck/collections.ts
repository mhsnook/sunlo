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
