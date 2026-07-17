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
import type { TablesUpdate } from '@/types/supabase'

// Columns we want off the phrase_meta view (slim — no `tags` JSON column;
// tags live in `phraseTagLinksCollection` and compose on via live query).
// We still read from the view because `count_learners`, `avg_difficulty`,
// `avg_stability` are computed there.
const PHRASE_META_COLUMNS =
	'id, public_id, created_at, text, lang, added_by, only_reverse, archived, avg_difficulty, avg_stability, count_learners'

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
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const r = m.modified
					await supabase
						.from('phrase')
						.insert({
							id: r.id,
							public_id: r.public_id,
							lang: r.lang,
							text: r.text,
							only_reverse: r.only_reverse,
							added_by: r.added_by ?? undefined,
						})
						.throwOnError()
				})
			)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'phrase'>
					await supabase
						.from('phrase')
						.update(changes)
						.eq('id', m.original.id)
						.throwOnError()
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
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const r = m.modified
					await supabase
						.from('phrase_translation')
						.insert({
							id: r.id,
							phrase_id: r.phrase_id,
							lang: r.lang,
							text: r.text,
							added_by: r.added_by ?? undefined,
						})
						.throwOnError()
				})
			)
			return { refetch: false }
		},
		onUpdate: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const changes = m.changes as TablesUpdate<'phrase_translation'>
					await supabase
						.from('phrase_translation')
						.update(changes)
						.eq('id', m.original.id)
						.throwOnError()
				})
			)
			return { refetch: false }
		},
		onDelete: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					await supabase
						.from('phrase_translation')
						.delete()
						.eq('id', m.original.id)
						.throwOnError()
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
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const r = m.modified
					await supabase
						.from('phrase_tag')
						.insert({
							phrase_id: r.phrase_id,
							tag_id: r.tag_id,
							added_by: r.added_by,
						})
						.throwOnError()
				})
			)
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
