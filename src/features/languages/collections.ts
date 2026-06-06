import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	LanguageSchema,
	type LanguageType,
	LangTagSchema,
	type LangTagType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const languagesCollection = createCollection(
	queryCollectionOptions({
		id: 'languages',
		queryKey: ['public', 'meta_language'],
		queryFn: async () => {
			console.log(`Loading languagesCollection`)
			const { data } = await supabase
				.from('meta_language')
				.select()
				.is('alias_of', null)
				.throwOnError()
			return data?.map((item) => LanguageSchema.parse(item)) ?? []
		},
		getKey: (item: LanguageType) => item.lang,
		schema: LanguageSchema,
		queryClient,
	})
)

export const langTagsCollection = createCollection(
	queryCollectionOptions({
		id: 'lang_tags',
		queryKey: ['public', 'lang_tag'],
		getKey: (item: LangTagType) => item.id,
		queryFn: async () => {
			console.log(`Loading langTagsCollection`)
			const { data } = await supabase.from('tag').select().throwOnError()
			return data?.map((p) => LangTagSchema.parse(p)) ?? []
		},
		schema: LangTagSchema,
		queryClient,
		onInsert: async ({ transaction }) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const r = m.modified
					await supabase
						.from('tag')
						.insert({
							id: r.id,
							name: r.name,
							lang: r.lang,
							added_by: r.added_by,
						})
						.throwOnError()
				})
			)
			return { refetch: false }
		},
	})
)
