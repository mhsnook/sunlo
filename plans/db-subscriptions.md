# TANSTACK DB REFACTOR PLANS

**Goal: Segment data fetching to avoid downloading the entire database**

1. Define "base data" such as the user's own personal data + the metadata for all the languages, and use the (existing) react query collections to manage these.
2. Dynamically assign what other data to subscribe to from e.g. the public library, or recent requests from friends, to avoid downloading the entire thing, accounting both for whole-language consumption as well as card-specific, user-specific, request-specific consumption, time-slices, etc.
3. Rely as much as possible on our libs and their features, i.e. try to use tanstack query's caching layer but without breaking tanstack db's ability to do liveQueryCollections and useLiveQuery

## PLAN 1:Parameterized queries and manually update the `@tanstack/db` cache.

1. Context

   - The current `queryFn` in `createCollection` fetches all data, which is inefficient.
   - We will stop using a single, global `queryFn` for large collections like `phrases` and `phrase_requests`.
   - Instead, we will fetch data for each of the user's relevant languages (`learning_languages`, `helping_languages`) using separate, parameterized queries.

2. Loading "base data" plus one language at a time

   - The `_user.tsx` layout is the perfect place to manage this. It already ensures a user profile is loaded.

   - We will create a new component, e.g., `<DataSubscriber />`, to be rendered within the user layout.

   - This component will:
     a. Get the user's languages from the profile.
     b. For each language, run a `useQuery` to fetch the relevant data (e.g., phrases for 'es', phrases for 'fr').
     c. Use a `useEffect` to take the data from these successful queries and merge it into the main collection cache using `queryClient.setQueryData`. This avoids clobbering and allows us to build up the local DB from multiple sources.

   - **Example `DataSubscriber` component:**

   ```typescriptreact
   // in a new file, e.g., @/components/data-subscriber.tsx
   import { useQuery, useQueryClient } from '@tanstack/react-query'
   import { useEffect } from 'react'
   import { useAuth } from '@/lib/hooks'
   import { myProfileCollection, phrasesCollection } from '@/lib/collections'
   import supabase from '@/lib/supabase-client'

   // A query to fetch phrases for a single language
   const languagePhrasesQueryOptions = (lang: string) => ({
   	queryKey: ['phrases', lang],
   	queryFn: async () => {
   		const { data, error } = await supabase
   			.rpc('get_phrases_for_lang', { lang_code: lang }) // Assumes an RPC function
   		if (error) throw error
   		return data
   	},
   })

   export function DataSubscriber() {
   	const { userId } = useAuth()
   	const queryClient = useQueryClient()
   	const [myProfile] = myProfileCollection.use()

   	const relevantLangs = [
   		...(myProfile?.learning_languages ?? []),
   		...(myProfile?.helping_languages ?? []),
   	]
   	const uniqueLangs = [...new Set(relevantLangs)]

   	// This part is conceptual; you'd have one for each data type (phrases, requests, etc.)
   	const { data: phrasesForLangs } = useQuery({
   		queryKey: ['phrases', 'by-lang', uniqueLangs],
   		queryFn: async () => {
   			// This could fetch all relevant languages' data in one go if you prefer
   			// Or you could have one useQuery per language.
   			const promises = uniqueLangs.map(lang =>
   				queryClient.ensureQueryData(languagePhrasesQueryOptions(lang))
   			)
   			await Promise.all(promises)
   			return true // Indicate success
   		},
   		enabled: uniqueLangs.length > 0,
   	})

   	// Here's where we merge the data into the main collection
   	useEffect(() => {
   		if (!phrasesForLangs) return

   		const allPhrases = uniqueLangs.flatMap(lang =>
   			queryClient.getQueryData(['phrases', lang]) ?? []
   		)

   		// This is the magic: we manually set the data for the collection's query key.
   		// This populates @tanstack/db without triggering a full refetch of the collection itself.
   		queryClient.setQueryData(phrasesCollection.queryKey, allPhrases)

   	}, [phrasesForLangs, queryClient, uniqueLangs])

   	// This component can also manage the Supabase realtime subscriptions
   	useEffect(() => {
   		if (!userId || uniqueLangs.length === 0) return

   		const channels = uniqueLangs.map(lang => {
   			return supabase.channel(`phrases-${lang}`)
   				.on('postgres_changes', { event: '*', schema: 'public', table: 'phrase', filter: `lang=eq.${lang}` },
   					(payload) => {
   						// Use collection.utils to insert/update/delete
   						console.log(`Realtime update for ${lang}:`, payload)
   						// e.g., phrasesCollection.utils.writeUpdate(...)
   					}
   				).subscribe()
   		})

   		return () => {
   			channels.forEach(channel => supabase.removeChannel(channel))
   		}
   	}, [userId, uniqueLangs])

   	return null // This component only handles data fetching.
   }
   ```

3. **Handling On-Demand Data**

   - For a page like `/learn/de/some-phrase-id` where 'de' is not a subscribed language, we'll fetch the data on-demand.

   - The component for this page will use a specific query, e.g., `useQuery({ queryKey: ['phrase', 'de', 'some-phrase-id'], ... })`.

   - We will then use the collection's `utils` to insert this single item into the local DB. This is non-destructive and will not be clobbered.

   - **Example on-demand fetch and insert:**

   ```typescriptreact
   // in a component like src/routes/learn/$lang/$pid.tsx
   import { phrasesCollection } from '@/lib/collections'

   function PhrasePage() {
   	const { lang, pid } = Route.useParams()
   	const { data: phrase } = useSuspenseQuery(phraseQueryOptions(lang, pid)) // Fetches a single phrase

   	useEffect(() => {
   		if (phrase) {
   			// Insert the single phrase into the collection.
   			// This will make it available to live queries.
   			phrasesCollection.utils.writeInsert(phrase)
   		}
   	}, [phrase])

   	// ... render the phrase
   }
   ```

## PLAN 2: Dynamic, Language-Specific Collections

    - This approach is intended to align with TanStack Query's and TanStack DB's intended patterns. It avoids manual cache management with `setQueryData` and is more declarative.

    - **Strategy Breakdown:**

    	a. **Dynamically Create Collections:** Instead of one giant `phrasesCollection`, we will create a factory function that generates a collection for a *specific language*. For example, `createPhrasesCollection('es')` would return a collection with `queryKey: ['phrases', 'es']` and a `queryFn` that only fetches Spanish phrases.

    	b. **Instantiate Collections in a Layout:** In the `_user.tsx` layout (or a dedicated subscriber component), we'll get the user's languages and instantiate a collection for each one. React Query's lifecycle management will handle everything else. If a component uses data from the Spanish collection, it will be fetched/refetched. If no component uses the Tamil collection, it will remain dormant and eventually be garbage collected. This perfectly matches the goal.

    	c. **Combine Collections with a Custom Hook:** Since `@tanstack/db`'s `createLiveQueryCollection` is for joining, not unioning, we'll create a custom hook like `useAllPhrases()` to combine the data. This hook will get the user's languages, access each language-specific collection, and return a concatenated, memoized array of all phrases from all subscribed languages. This gives us a unified, reactive view of all subscribed data.

    	d. **Handle On-Demand Data:** For phrases outside the subscribed languages, we'll fetch them individually. The page component (e.g., `/learn/$lang/$pid.tsx`) will have a `loader` that calls `queryClient.ensureQueryData` for that single phrase. We will then need a way to merge this single item into our view. The `useAllPhrases` hook can be designed to also include these individually fetched items from the query cache.

    - **Example Implementation:**
    ```typescript
    // in @/lib/collections.ts (or a new file)

    // 1. Factory for language-specific collections
    export const createPhrasesCollection = (lang: string) => {
    	return createCollection(
    		queryCollectionOptions({
    			queryKey: ['phrases', lang],
    			queryFn: async () => {
    				// RPC or filtered query to get phrases for just this language
    				const { data } = await supabase.rpc('get_phrases_for_lang', { lang_code: lang }).throwOnError()
    				return data?.map((p) => PhraseFullSchema.parse(p)) ?? []
    			},
    			getKey: (item: PhraseFullType) => item.id,
    			queryClient,
    			schema: PhraseFullSchema,
    		})
    	)
    }

    // 2. In a component, instantiate and use them
    function DataSubscriber() {
    	const [myProfile] = myProfileCollection.use()
    	const relevantLangs = [...new Set([...(myProfile?.learning_languages ?? []), ...(myProfile?.helping_languages ?? [])])]

    	// Instantiate collections for each language.
    	// We can store these in a memoized map.
    	const collections = useMemo(() => {
    		return new Map(relevantLangs.map(lang => [lang, createPhrasesCollection(lang)]))
    	}, [relevantLangs])

    	// Preload all of them. React Query will only fetch if a component is using the data.
    	useEffect(() => {
    		collections.forEach(collection => collection.preload())
    	}, [collections])

    	return null
    }

    // 3. Custom hook to combine data
    function useAllPhrases() {
    	const [myProfile] = myProfileCollection.use()
    	const relevantLangs = [...new Set([...(myProfile?.learning_languages ?? []), ...(myProfile?.helping_languages ?? [])])]

    	// This is conceptual. We'd need to get each collection's data.
    	// This part is tricky because we can't call hooks in a loop.
    	// We might need a context provider to hold the collection instances.
    	// Then this hook could read from that context.

    	// A simpler start is to just query the cache directly.
    	const queryClient = useQueryClient()
    	const allPhrases = relevantLangs.flatMap(lang => {
    		return queryClient.getQueryData<Array<PhraseFullType>>(['phrases', lang]) ?? []
    	})

    	// This hook would need to subscribe to query cache changes to be reactive.
    	// This shows the complexity, but it is solvable.
    	return allPhrases
    }
    ```

## PLAN 3: HYBRID

    - Intended to be robust, scalable, and leverage libraries correctly while minimizing complex custom code.

    - **Strategy: Use a single, dynamic collection for subscriptions, and route loaders for on-demand data.**
    	1.  **Modify Global Collections to be Dynamic:** Instead of a static `phrasesCollection`, we'll create a hook like `useSubscribedPhrasesCollection()`. This hook will be responsible for creating a collection instance whose `queryKey` and `queryFn` are based on the user's currently subscribed languages.

    	2.  **Centralize Subscription Logic:** A component like `<DataSubscriber />` in the `_user.tsx` layout will call this hook to ensure the main data subscription is active for authenticated users. This keeps the data fetching logic tied to the user's session.

    	3.  **Refactor Live Queries:** Your `liveQueryCollection`s (e.g., `phrasesFull`) will need to be converted into hooks (e.g., `usePhrasesFull()`). Inside this hook, they will first call `useSubscribedPhrasesCollection()` to get the base collection and then perform their joins. This makes them reactive to the user's language preferences.

    	4.  **Handle On-Demand Data via Route Loaders:** For routes that display a single item not in the user's subscriptions (e.g., `/learn/de/:pid`), we will use the TanStack Router `loader` function. This is the perfect, targeted place for an imperative action. The loader will:
    		a. Fetch the single item using `queryClient.ensureQueryData`.
    		b. Manually and safely insert this single item into the cache of the main subscribed collection using `queryClient.setQueryData`. This is a non-destructive merge, so it won't clobber existing data and will persist until the main collection's key changes (i.e., when the user's languages change).

    - **Example Implementation:**

    ```typescript
    // In a new file, e.g., @/lib/hooks/use-collections.ts
    import { useMemo } from 'react'
    import { createCollection } from '@tanstack/react-db'
    import { queryCollectionOptions } from '@tanstack/query-db-collection'
    import { myProfileCollection } from '@/lib/collections'
    import { queryClient } from '@/lib/query-client'
    import supabase from '@/lib/supabase-client'
    import { PhraseFullSchema, type PhraseFullType } from '@/lib/schemas'

    export function useSubscribedPhrasesCollection() {
    	const [myProfile] = myProfileCollection.use()
    	const relevantLangs = useMemo(() =>
    		[...new Set([...(myProfile?.learning_languages ?? []), ...(myProfile?.helping_languages ?? [])])].sort()
    	, [myProfile])

    	// useMemo ensures we return the same collection instance for the same set of languages
    	return useMemo(() => createCollection(
    		queryCollectionOptions({
    			queryKey: ['public', 'phrase_full', 'subscribed', relevantLangs],
    			queryFn: async () => {
    				if (relevantLangs.length === 0) return []
    				const { data } = await supabase.rpc('get_phrases_for_languages', { lang_codes: relevantLangs }).throwOnError()
    				return data?.map((p: unknown) => PhraseFullSchema.parse(p)) ?? []
    			},
    			getKey: (item: PhraseFullType) => item.id,
    			queryClient,
    			schema: PhraseFullSchema,
    			enabled: relevantLangs.length > 0,
    		})
    	), [relevantLangs])
    }
    ```

    ```typescriptreact
    // In a route file like /routes/learn/$lang/$pid.tsx
    export const Route = createFileRoute('/learn/$lang/$pid')({
    	loader: async ({ params, context }) => {
    		const { queryClient } = context
    		// 1. Fetch the single phrase if it's not already cached
    		const phrase = await queryClient.ensureQueryData(phraseQueryOptions(params.lang, params.pid))

    		// 2. Find the active collection's query key
    		const activeCollectionKey = queryClient.getQueryCache().findAll({
    			queryKey: ['public', 'phrase_full', 'subscribed'],
    			exact: false,
    		})[0]?.queryKey

    		// 3. Imperatively add the new phrase to the collection's data
    		if (activeCollectionKey) {
    			queryClient.setQueryData(activeCollectionKey, (oldData: Array<PhraseFullType> | undefined) => {
    				if (!oldData) return [phrase]
    				if (oldData.some(p => p.id === phrase.id)) return oldData // Avoid duplicates
    				return [...oldData, phrase]
    			})
    		}
    		return { phrase }
    	},
    	component: PhrasePage,
    })
    ```

## PLAN 4: Refined Hybrid

## REFINED HYBRID PLAN

    - Intended to be robust, scalable, and leverage libraries correctly while minimizing complex custom code.

    - **Strategy: Use a single, dynamic collection for subscriptions, and route loaders for on-demand data.**
      1.  **Create a Dynamic Collection Hook:** Instead of a static `phrasesCollection`, we'll create a hook like `useSubscribedPhrasesCollection()`. This hook will be responsible for creating a collection instance whose `queryKey` and `queryFn` are based on the user's currently subscribed languages.

      2.  **Centralize Subscription Logic:** A component like `<DataSubscriber />` in the `_user.tsx` layout will call this hook to ensure the main data subscription is active for authenticated users. This keeps the data fetching logic tied to the user's session.

      3.  **Refactor Live Queries into Hooks:** Your `liveQueryCollection`s (e.g., `phrasesFull`) will need to be converted into hooks (e.g., `usePhrasesFullLiveQuery()`). Inside this hook, they will first call `useSubscribedPhrasesCollection()` to get the base collection and then perform their joins. This makes them reactive to the user's language preferences.

      4.  **Handle On-Demand Data via Route Loaders:** For routes that display a single item not in the user's subscriptions (e.g., `/learn/de/:pid`), we will use the TanStack Router `loader` function. This is the perfect, targeted place for an imperative action. The loader will:
         a. Fetch the single item using `queryClient.ensureQueryData`.
         b. Manually and safely insert this single item into the local collection using the collection's `insert()` method. This is non-destructive and will make the item available to all live queries.

    - **Example Implementation:**

    ```typescript
    // In a new file, e.g., @/lib/hooks/use-collections.ts
    import { useMemo } from 'react'
    import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
    import { queryCollectionOptions } from '@tanstack/query-db-collection'
    import { myProfileCollection } from '@/lib/collections'
    import { queryClient } from '@/lib/query-client'
    import supabase from '@/lib/supabase-client'
    import { PhraseFullSchema, type PhraseFullType } from '@/types/main'

    export function useSubscribedPhrasesCollection() {
      const [myProfile] = myProfileCollection.use()
      const relevantLangs = useMemo(() =>
         [...new Set([...(myProfile?.learning_languages ?? []), ...(myProfile?.helping_languages ?? [])])].sort()
      , [myProfile])

      // useMemo ensures we return the same collection instance for the same set of languages
      return useMemo(() => createCollection(
         queryCollectionOptions({
            queryKey: ['public', 'phrase_full', 'subscribed', relevantLangs],
            queryFn: async () => {
               if (relevantLangs.length === 0) return []
               const { data } = await supabase.rpc('get_phrases_for_languages', { lang_codes: relevantLangs }).throwOnError()
               return data?.map((p: unknown) => PhraseFullSchema.parse(p)) ?? []
            },
            getKey: (item: PhraseFullType) => item.id,
            queryClient,
            schema: PhraseFullSchema,
            // We handle writes locally for on-demand items,
            // but don't need to persist them back to the server.
            onInsert: async () => {},
            onUpdate: async () => {},
            enabled: relevantLangs.length > 0,
         })
      ), [relevantLangs])
    }
    ```

    ```typescript
    // In a route file like /routes/learn/$lang/$pid.tsx
    import { useSubscribedPhrasesCollection } from '@/lib/hooks/use-collections'

    export const Route = createFileRoute('/learn/$lang/$pid')({
      loader: async ({ params, context }) => {
         const { queryClient } = context
         const { lang, pid } = params

         // 1. Fetch the single phrase if it's not already cached
         const phrase = await queryClient.ensureQueryData(phraseQueryOptions(lang, pid))

         // 2. Get an instance of the currently subscribed collection
         // This is a bit of a hack since we can't use the hook directly in the loader.
         // We can create a temporary instance to get access to the utils.
         // A better way would be to pass the collection factory to the router context.
         const tempPhrasesCollection = useSubscribedPhrasesCollection() // This won't work in loader, conceptual.

         // 3. Imperatively add the new phrase to the collection if it's not there.
         // This makes it available to live queries.
         if (phrase && !tempPhrasesCollection.get(phrase.id)) {
            tempPhrasesCollection.insert(phrase, { optimistic: true })
         }

         return { phrase }
      },
      component: PhrasePage,
    })
    ```

## PLAN 5: Pure LiveQueries, Custom Subscriptions

1. for collections loaded in their entirely like myProfileCollections and decksCollection, load the entire query with a regular react query collection
2. for segmented collections and the tables they relate to, like `phrase` and `phrase_request`, use useQuery and ensureQueryData and prefetchQuery to fetch data and insert directly into the collection
3. when these queries become stale, react-query's own tooling will decide when to re-run the queryFn, which will refresh the data
   - this means if data will change to remove it from one query, it will get out of sync, so records can't be deleted, and the keys that are used to query things can't change (like a phrase's language or added_by user id)
4. look into other react-query lifecycle events and hooks, like when something is garbage-collected from react-query, we might also remove it from the collection
5. put in safeguards to detect wrong loading and load items imperatively, and/or to clear a collection and invalidate the related queries to reload data entirely
6. queries that populate the same collection should have the same first two query keys, like `['public', 'phrase', otherFilter, moreSpecific]` and `['public', 'phrase', 'lang', lang]`

Relevant context: Tanstack Query's [query-core module provides this QueryCacheNotifyEvent interface](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts#L71-L78):
```typescript
export type QueryCacheNotifyEvent =
  | NotifyEventQueryAdded
  | NotifyEventQueryRemoved
  | NotifyEventQueryUpdated
  | NotifyEventQueryObserverAdded
  | NotifyEventQueryObserverRemoved
  | NotifyEventQueryObserverResultsUpdated
  | NotifyEventQueryObserverOptionsUpdated
```
