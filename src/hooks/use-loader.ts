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

import { Collection } from '@tanstack/db'
import { skipToken } from '@tanstack/react-query'
import type {
	DefaultError,
	QueryClient,
	QueryFunction,
	QueryFunctionContext,
	QueryKey,
	QueryOptions,
	WithRequired,
} from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import type { ZodSchema } from 'zod'

type LoaderOptions<
	TItem extends object,
	TError = DefaultError,
	TQueryKey extends QueryKey = QueryKey,
> = WithRequired<
	Omit<
		QueryOptions<ReadonlyArray<TItem>, TError, boolean, TQueryKey>,
		'select'
	>,
	'queryKey' | 'queryFn'
> & {
	collection: Collection<TItem>
	schema: ZodSchema<TItem>
}

async function loadifyFn<TItem extends object, TQueryKey extends QueryKey>(
	queryFn:
		| QueryFunction<ReadonlyArray<TItem> | null, TQueryKey>
		| typeof skipToken,
	context: QueryFunctionContext<TQueryKey>,
	collection: Collection<TItem>,
	schema: ZodSchema<TItem>
): Promise<boolean | null> {
	if (queryFn === skipToken) return null
	const data = await queryFn(context)

	if (Array.isArray(data) && data.length > 0) {
		collection.utils.writeBatch(() => {
			data.forEach((item) => collection.utils.writeInsert(schema.parse(item)))
		})
		return true
	}

	return false
}

export function useLoader<
	TItem extends object,
	TError = DefaultError,
	TQueryKey extends QueryKey = QueryKey,
>({ collection, schema, ...options }: LoaderOptions<TItem, TError, TQueryKey>) {
	const { queryKey, queryFn, ...query } = options
	return useQuery<ReadonlyArray<TItem> | null, TError, boolean | null, TQueryKey>({
		...query,
		queryKey,
		queryFn: (context) =>
			loadifyFn<TItem, TQueryKey>(queryFn, context, collection, schema),
	})
}

export async function prefetchLoader<
	TItem extends object,
	TError = DefaultError,
	TQueryKey extends QueryKey = QueryKey,
>(
	client: QueryClient,
	options: LoaderOptions<TItem, TError, TQueryKey>
): Promise<void> {
	const { queryKey, queryFn, collection, schema, ...query } = options
	return client.prefetchQuery<
		ReadonlyArray<TItem> | null,
		TError,
		boolean,
		TQueryKey
	>({
		queryKey,
		queryFn: (context) =>
			loadifyFn<TItem, TQueryKey>(queryFn, context, collection, schema),
		...query,
	})
}

export async function ensureLoaderData<
	TItem extends object,
	TError = DefaultError,
	TQueryKey extends QueryKey = QueryKey,
>(
	client: QueryClient,
	options: LoaderOptions<TItem, TError, TQueryKey>
): Promise<boolean> {
	const { queryKey, queryFn, collection, schema, ...query } = options
	return client.ensureQueryData<
		ReadonlyArray<TItem> | null,
		TError,
		boolean,
		TQueryKey
	>({
		queryKey,
		queryFn: (context) =>
			loadifyFn<TItem, TQueryKey>(queryFn, context, collection, schema),
		...query,
	})
}
