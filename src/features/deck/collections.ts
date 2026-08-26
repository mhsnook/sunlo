import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { DeckSchema, type DeckType, CardSchema, type CardType } from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import {
	allRowsMatch,
	rowMatches,
	writeSyncedRow,
	writeSyncedRows,
} from '@/lib/collections/synced-row'
import { should } from '@scenetest/checks/react'
import { sortDecksByCreation } from '@/lib/utils'
import type { TablesUpdate } from '@/types/supabase'

export const decksCollection = createCollection(
	queryCollectionOptions({
		id: 'decks',
		queryKey: ['user', 'deck'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading decksCollection`)
			const { data } = await supabase.from('user_deck').select().throwOnError()
			return (
				data
					?.map((item) => DeckSchema.parse(item))
					.toSorted(sortDecksByCreation) ?? []
			)
		},
		getKey: (item: DeckType) => item.lang,
		queryClient,
		startSync: false,
		schema: DeckSchema,
		onInsert: async ({ transaction }) => {
			// The insert sends only `lang` — uid, created_at and every other
			// column come back filled in by the server.
			const langs = transaction.mutations.map((m) => m.modified.lang)
			const { data } = await supabase
				.from('user_deck')
				.insert(langs.map((lang) => ({ lang })))
				.select()
				.throwOnError()
			const returned = data?.map((row) => DeckSchema.parse(row)) ?? []
			should(
				'user_deck insert returned one row per deck the optimistic insert added',
				allRowsMatch(
					langs.map((lang) => ({ lang })),
					returned
				),
				{ submitted: langs, returned }
			)
			writeSyncedRows(decksCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'user_deck'>
					const { data } = await supabase
						.from('user_deck')
						.update(changes)
						.eq('uid', m.original.uid)
						.eq('lang', m.original.lang)
						.select()
						.throwOnError()
					// m.changes IS the optimistic collection value, so confirming the
					// server's returned row matches it proves client/server agreement.
					const row = data?.[0]
					should(
						`user_deck (${m.original.lang}) server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row) writeSyncedRow(decksCollection, DeckSchema.parse(row))
				})
			)
			return { refetch: false }
		},
	})
)

export const cardsCollection = createCollection(
	queryCollectionOptions({
		id: 'cards',
		queryKey: ['user', 'card'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading cardsCollection`)
			const { data } = await supabase.from('user_card').select().throwOnError()
			return data?.map((item) => CardSchema.parse(item)) ?? []
		},
		getKey: (item: CardType) => item.id,
		queryClient,
		startSync: false,
		schema: CardSchema,
		onInsert: async ({ transaction }) => {
			const rows = transaction.mutations.map((m) => m.modified)
			const { data } = await supabase
				.from('user_card')
				.insert(rows)
				.select()
				.throwOnError()
			const returned = data?.map((row) => CardSchema.parse(row)) ?? []
			should(
				'user_card insert returned rows matching the optimistic cards',
				allRowsMatch(rows, returned),
				{ submitted: rows, returned }
			)
			writeSyncedRows(cardsCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'user_card'>
					const { data } = await supabase
						.from('user_card')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`user_card ${m.original.id} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row) writeSyncedRow(cardsCollection, CardSchema.parse(row))
				})
			)
			return { refetch: false }
		},
	})
)
