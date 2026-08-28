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
import { allRowsMatch, writeSyncedRows } from '@/lib/collections/synced-row'
import { should } from '@scenetest/checks/react'

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
			const submitted = transaction.mutations.map((m) => ({
				id: m.modified.id,
				name: m.modified.name,
				lang: m.modified.lang,
				added_by: m.modified.added_by,
			}))
			const { data } = await supabase
				.from('tag')
				.insert(submitted)
				.select()
				.throwOnError()
			const returned = data?.map((row) => LangTagSchema.parse(row)) ?? []
			should(
				'tag insert returned one row per tag the optimistic insert added',
				allRowsMatch(submitted, returned),
				{ submitted, returned }
			)
			writeSyncedRows(langTagsCollection, returned)
			return { refetch: false }
		},
	})
)
