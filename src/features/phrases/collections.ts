import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { BasicIndex } from '@tanstack/db'
import { PhraseFullSchema, type PhraseFullType } from './schemas'
import { phrasesQuery } from './queries'
import { queryClient } from '@/lib/query-client'

export { phrasesQuery }

export const phrasesCollection = createCollection(
	queryCollectionOptions({
		id: 'phrases',
		queryKey: phrasesQuery.queryKey,
		queryFn: phrasesQuery.queryFn!,
		getKey: (item: PhraseFullType) => item.id,
		schema: PhraseFullSchema,
		queryClient,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)
