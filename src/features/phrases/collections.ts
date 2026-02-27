import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	PhraseFullSchema,
	type PhraseFullType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const phrasesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrases',
		queryKey: ['public', 'phrase_full'],
		getKey: (item: PhraseFullType) => item.id,
		queryFn: async () => {
			console.log(`Loading phrasesCollection`)

			const { data } = await supabase
				.from('phrase_meta')
				.select('*, translations:phrase_translation(*)')
				.throwOnError()
			return data?.map((p) => PhraseFullSchema.parse(p)) ?? []
		},
		schema: PhraseFullSchema,
		queryClient,
	})
)
