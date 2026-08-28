import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhraseSchema,
	type PhraseType,
	PhraseTagLinkSchema,
	type PhraseTagLinkType,
	TranslationSchema,
	type TranslationType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import {
	allRowsMatch,
	rowMatches,
	writeSyncedRow,
	writeSyncedRows,
} from '@/lib/collections/synced-row'
import { should } from '@scenetest/checks/react'
import type { TablesUpdate } from '@/types/supabase'

// Columns we want off the phrase_meta view (slim — no `tags` JSON column;
// tags live in `phraseTagLinksCollection` and compose on via live query).
// We still read from the view because `count_learners`, `avg_difficulty`,
// `avg_stability` are computed there.
const PHRASE_META_COLUMNS =
	'id, created_at, text, lang, added_by, only_reverse, archived, avg_difficulty, avg_stability, count_learners'

export const phrasesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrases',
		queryKey: ['public', 'phrase_meta'],
		getKey: (item: PhraseType) => item.id,
		queryFn: async () => {
			console.log(`Loading phrasesCollection`)
			const { data } = await supabase
				.from('phrase_meta')
				.select(PHRASE_META_COLUMNS)
				.throwOnError()
			return data?.map((p) => PhraseSchema.parse(p)) ?? []
		},
		schema: PhraseSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map((m) => ({
				id: m.modified.id,
				lang: m.modified.lang,
				text: m.modified.text,
				only_reverse: m.modified.only_reverse,
				...(m.modified.added_by ? { added_by: m.modified.added_by } : {}),
			}))
			const { data } = await supabase
				.from('phrase')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned = data?.map((row) => PhraseSchema.parse(row)) ?? []
			should(
				'phrase insert returned one row per phrase the optimistic insert added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(phrasesCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'phrase'>
					const { data } = await supabase
						.from('phrase')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`phrase ${m.original.id} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					// `phrase_meta` is a view; the columns it computes are not on the
					// `phrase` row this update returns.
					if (row) {
						const current = phrasesCollection.get(m.original.id) ?? m.original
						writeSyncedRow(
							phrasesCollection,
							PhraseSchema.parse({ ...current, ...row })
						)
					}
				})
			)
			return { refetch: false }
		},
	})
)

export const phraseTranslationsCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_translations',
		queryKey: ['public', 'phrase_translation'],
		getKey: (item: TranslationType) => item.id,
		queryFn: async () => {
			console.log(`Loading phraseTranslationsCollection`)
			const { data } = await supabase
				.from('phrase_translation')
				.select('*')
				.throwOnError()
			return data?.map((t) => TranslationSchema.parse(t)) ?? []
		},
		schema: TranslationSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map((m) => ({
				id: m.modified.id,
				phrase_id: m.modified.phrase_id,
				lang: m.modified.lang,
				text: m.modified.text,
				...(m.modified.added_by ? { added_by: m.modified.added_by } : {}),
			}))
			const { data } = await supabase
				.from('phrase_translation')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned = data?.map((row) => TranslationSchema.parse(row)) ?? []
			should(
				'phrase_translation insert returned one row per translation added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(phraseTranslationsCollection, returned)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'phrase_translation'>
					const { data } = await supabase
						.from('phrase_translation')
						.update(changes)
						.eq('id', m.original.id)
						.select()
						.throwOnError()
					const row = data?.[0]
					should(
						`phrase_translation ${m.original.id} server row matches the submitted update`,
						rowMatches(changes, row),
						{ submitted: changes, returned: row }
					)
					if (row)
						writeSyncedRow(
							phraseTranslationsCollection,
							TranslationSchema.parse(row)
						)
				})
			)
			return { refetch: false }
		},
	})
)

export const phraseTagLinksCollection = createCollection(
	queryCollectionOptions({
		id: 'phrase_tag_links',
		queryKey: ['public', 'phrase_tag'],
		getKey: (item: PhraseTagLinkType) => `${item.phrase_id}--${item.tag_id}`,
		queryFn: async () => {
			console.log(`Loading phraseTagLinksCollection`)
			const { data } = await supabase
				.from('phrase_tag')
				.select('*')
				.throwOnError()
			return data?.map((r) => PhraseTagLinkSchema.parse(r)) ?? []
		},
		schema: PhraseTagLinkSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map((m) => ({
				phrase_id: m.modified.phrase_id,
				tag_id: m.modified.tag_id,
				added_by: m.modified.added_by,
			}))
			const { data } = await supabase
				.from('phrase_tag')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned = data?.map((row) => PhraseTagLinkSchema.parse(row)) ?? []
			should(
				'phrase_tag insert returned one row per tag link added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(phraseTagLinksCollection, returned)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					await supabase
						.from('phrase_tag')
						.delete()
						.eq('phrase_id', m.original.phrase_id)
						.eq('tag_id', m.original.tag_id)
						.throwOnError()
				})
			)
			return { refetch: false }
		},
	})
)
