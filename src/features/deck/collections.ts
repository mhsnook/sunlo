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
import { should } from '@scenetest/checks-react'
import { sortDecksByCreation } from '@/lib/utils'
import languages from '@/lib/languages'
import type { TablesUpdate } from '@/types/supabase'

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
					.map((d) =>
						Object.assign(d, {
							language: languages[d.lang],
						})
					) ?? []
			)
		},
		getKey: (item: DeckMetaType) => item.lang,
		queryClient,
		startSync: false,
		schema: DeckMetaSchema,
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
					// Stripped from production by the Vite plugin.
					const row = data?.[0] as Record<string, unknown> | undefined
					if (row)
						should(
							`user_deck (${m.original.lang}) server row matches the submitted update`,
							Object.entries(changes).every(
								([k, v]) =>
									k === 'updated_at' || k === 'created_at' || row[k] === v
							),
							{ submitted: changes, returned: row }
						)
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
			const rows = transaction.mutations.map((m) => ({
				id: m.modified.id,
				uid: m.modified.uid,
				phrase_id: m.modified.phrase_id,
				lang: m.modified.lang,
				status: m.modified.status,
				direction: m.modified.direction,
				created_at: m.modified.created_at,
				updated_at: m.modified.updated_at,
			}))
			const { data } = await supabase
				.from('user_card')
				.insert(rows)
				.select()
				.throwOnError()
			// Confirm the server stored the same cards our optimistic insert
			// added to the collection. Stripped from production by the Vite plugin.
			should(
				'user_card insert returned rows matching the optimistic cards',
				!!data &&
					data.length === rows.length &&
					rows.every((row) =>
						data.some(
							(d) =>
								d.id === row.id &&
								d.status === row.status &&
								d.phrase_id === row.phrase_id &&
								d.direction === row.direction &&
								d.lang === row.lang
						)
					),
				{ submitted: rows, returned: data }
			)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			// Throwing rolls the optimistic state back. { refetch: false } keeps
			// the confirmed value locally instead of reloading user_card_plus —
			// safe because user_card has no triggers that change other columns.
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'user_card'>
					const { data } = await supabase
						.from('user_card')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					// Confirm the server's returned row matches the optimistic
					// update. Stripped from production by the Vite plugin.
					const row = data?.[0] as Record<string, unknown> | undefined
					if (row)
						should(
							`user_card ${m.original.id} server row matches the submitted update`,
							Object.entries(changes).every(
								([k, v]) =>
									k === 'updated_at' || k === 'created_at' || row[k] === v
							),
							{ submitted: changes, returned: row }
						)
				})
			)
			return { refetch: false }
		},
	})
)
