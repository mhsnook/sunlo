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
	})
)
