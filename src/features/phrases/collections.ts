import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import {
	PhraseSchema,
	type PhraseType,
	TranslationSchema,
	type TranslationType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const phrasesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrases',
		queryKey: ['public', 'phrase_meta'],
		getKey: (item: PhraseType) => item.id,
		queryFn: async () => {
			console.log(`Loading phrasesCollection`)
			const { data } = await supabase
				.from('phrase_meta')
				.select('*')
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
