/*
## PLAN 5: Pure LiveQueries, Custom Subscriptions

1. for collections loaded in their entirely like myProfileCollections and decksCollection, load the entire query with a regular react query collection
2. for segmented collections and the tables they relate to, like `phrase` and `phrase_request`, use useQuery and ensureQueryData and prefetchQuery to fetch data and insert directly into the collection
3. when these queries become stale, react-query's own tooling will decide when to re-run the queryFn, which will refresh the data
   - this means if data will change to remove it from one query, it will get out of sync, so records can't be deleted, and the keys that are used to query things can't change (like a phrase's language or added_by user id)
4. look into other react-query lifecycle events and hooks, like when something is garbage-collected from react-query, we might also remove it from the collection
5. put in safeguards to detect wrong loading and load items imperatively, and/or to clear a collection and invalidate the related queries to reload data entirely
6. queries that populate the same collection should have the same first two query keys, like `['public', 'phrase', otherFilter, moreSpecific]` and `['public', 'phrase', 'lang', lang]`

Read more: /plans/db-subscriptions
```
*/

import { phrasesCollection } from '@/lib/collections'
import { PhraseFullSchema } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { uuid } from '@/types/main'
import { Tables } from '@/types/supabase'
import { Collection } from '@tanstack/db'
import { queryOptions } from '@tanstack/react-query'
import * as z from 'zod'
import type { ZodSchema } from 'zod'

const phrasesQueryBuilder = supabase
	.from('meta_phrase_info')
	.select('*, translations:phrase_translation(*)')
	.throwOnError()

type PhraseFetched = Tables<'meta_phrase_info'> & {
	translations: Tables<'phrase_translation'>[]
}

function collectify<TItem>(
	data: TItem[] | null,
	collection: Collection<z.infer<typeof schema>>,
	schema: ZodSchema
) {
	if (!data || !Array.isArray(data)) return false

	data.forEach((item: TItem) => collection.insert(schema.parse(item)))

	return true
}

export const phraseLanguageLoaderQuery = (lang: string) =>
	queryOptions({
		queryKey: ['public', 'phrase_full', 'lang', lang],
		queryFn: async () => {
			const { data: phrases } = await phrasesQueryBuilder.eq('lang', lang)
			return collectify<PhraseFetched>(
				phrases,
				phrasesCollection,
				PhraseFullSchema
			)
		},
		enabled: !!lang,
		staleTime: Infinity,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	})

export const phraseIdsLoaderQuery = (pids: uuid[]) =>
	queryOptions({
		queryKey: ['public', 'phrase_full', 'pids', pids],
		queryFn: async () => {
			const { data: phrases } = await phrasesQueryBuilder.in('id', pids)
			return collectify<PhraseFetched>(
				phrases,
				phrasesCollection,
				PhraseFullSchema
			)
		},
		enabled: !!pids,
		staleTime: 120_000,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
	})

export const phraseAddedByLoaderQuery = (uids: uuid[]) =>
	queryOptions({
		queryKey: ['public', 'phrase_full', 'added_py', uids],
		queryFn: async () => {
			const { data: phrases } = await phrasesQueryBuilder.in('added_by', uids)
			return collectify<PhraseFetched>(
				phrases,
				phrasesCollection,
				PhraseFullSchema
			)
		},
		enabled: !!uids,
		staleTime: 120_000,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
	})
