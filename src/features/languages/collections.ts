import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	LanguageSchema,
	type LanguageType,
	LangTagSchema,
	type LangTagType,
} from './schemas'
import { languagesQuery, langTagsQuery } from './queries'
import { queryClient } from '@/lib/query-client'

export { languagesQuery, langTagsQuery }

export const languagesCollection = createCollection(
	queryCollectionOptions({
		id: 'languages',
		queryKey: languagesQuery.queryKey,
		queryFn: languagesQuery.queryFn!,
		getKey: (item: LanguageType) => item.lang,
		schema: LanguageSchema,
		queryClient,
	})
)

export const langTagsCollection = createCollection(
	queryCollectionOptions({
		id: 'lang_tags',
		queryKey: langTagsQuery.queryKey,
		queryFn: langTagsQuery.queryFn!,
		getKey: (item: LangTagType) => item.id,
		schema: LangTagSchema,
		queryClient,
	})
)
