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
import { should, serverCheck, failed } from '@scenetest/checks-react'
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
				transaction.mutations.map((m) =>
					supabase
						.from('user_deck')
						.update(m.changes as TablesUpdate<'user_deck'>)
						.eq('uid', m.original.uid)
						.eq('lang', m.original.lang)
						.throwOnError()
				)
			)
			// m.changes IS the optimistic collection value, so confirming the
			// server row matches it proves client/server agreement without
			// inspecting the collection separately. Stripped from production.
			serverCheck(
				'user_deck rows match the submitted updates',
				async (server, { updates }) => {
					await Promise.all(
						updates.map(async (u) => {
							const { data, error } = await server.supabase
								.from('user_deck')
								.select()
								.eq('uid', u.uid)
								.eq('lang', u.lang)
								.maybeSingle()
							if (error || !data) {
								failed('fetch user_deck after update', {
									error: error?.message,
									lang: u.lang,
								})
								return
							}
							const row = data as Record<string, unknown>
							should(
								`user_deck (${u.lang}) persisted the submitted values`,
								Object.entries(u.changes).every(
									([k, v]) =>
										k === 'updated_at' || k === 'created_at' || row[k] === v
								),
								{ submitted: u.changes, returned: data }
							)
						})
					)
				},
				() => ({
					updates: transaction.mutations.map((m) => ({
						uid: m.original.uid,
						lang: m.original.lang,
						changes: m.changes as Record<string, unknown>,
					})),
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
			// Confirm the server stored the same cards our optimistic insert
			// added to the collection. Stripped from production.
			serverCheck(
				'inserted user_card rows match the optimistic cards',
				async (server, { cards }) => {
					const { data, error } = await server.supabase
						.from('user_card')
						.select('id, status, phrase_id, direction, lang')
						.in(
							'id',
							cards.map((c) => c.id)
						)
					if (error || !data) {
						failed('fetch user_card after insert', { error: error?.message })
						return
					}
					should(
						'every optimistic card was inserted',
						data.length === cards.length,
						{
							expected: cards.length,
							got: data.length,
						}
					)
					cards.forEach((c) => {
						const row = data.find((d) => d.id === c.id)
						should(
							`user_card ${c.id} matches the optimistic row`,
							!!row &&
								row.status === c.status &&
								row.phrase_id === c.phrase_id &&
								row.direction === c.direction &&
								row.lang === c.lang,
							{ optimistic: c, returned: row }
						)
					})
				},
				() => ({
					cards: transaction.mutations.map((m) => ({
						id: m.modified.id,
						status: m.modified.status,
						phrase_id: m.modified.phrase_id,
						direction: m.modified.direction,
						lang: m.modified.lang,
					})),
				})
			)
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
						.update(m.changes as TablesUpdate<'user_card'>)
						.eq('id', m.original.id)
						.throwOnError()
				)
			)
			// Confirm the server row matches the optimistic update. Stripped
			// from production.
			serverCheck(
				'user_card rows match the submitted updates',
				async (server, { updates }) => {
					await Promise.all(
						updates.map(async (u) => {
							const { data, error } = await server.supabase
								.from('user_card')
								.select()
								.eq('id', u.id)
								.maybeSingle()
							if (error || !data) {
								failed('fetch user_card after update', {
									error: error?.message,
									id: u.id,
								})
								return
							}
							const row = data as Record<string, unknown>
							should(
								`user_card ${u.id} persisted the submitted values`,
								Object.entries(u.changes).every(
									([k, v]) =>
										k === 'updated_at' || k === 'created_at' || row[k] === v
								),
								{ submitted: u.changes, returned: data }
							)
						})
					)
				},
				() => ({
					updates: transaction.mutations.map((m) => ({
						id: m.original.id,
						changes: m.changes as Record<string, unknown>,
					})),
				})
			)
			return { refetch: false }
		},
	})
)
