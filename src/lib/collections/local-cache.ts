import { queryClient } from '@/lib/query-client'
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema } from '@/features/deck/schemas'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { MyProfileSchema } from '@/features/profile/schemas'

/**
 * Dead-simple localStorage cache for the two smallest, slowest-changing user
 * collections — profile and decks. On boot we seed TanStack Query's cache from
 * localStorage so they paint instantly; on every collection change we write the
 * current rows straight back.
 *
 * Supabase stays the source of truth: this is only a warm cache. The normal
 * sync refetches both collections on login (see auth-context) and overwrites
 * whatever we restored, so a stale entry is corrected within the first fetch.
 *
 * Logout needs no special handling — clearUser() refetches both collections,
 * the empty RLS result empties them, and the change handler persists that empty
 * state, so a different user on the same device doesn't keep seeing old rows.
 */
function mirrorToLocalStorage(
	storageKey: string,
	queryKey: ReadonlyArray<string>,
	collection: {
		readonly toArray: ReadonlyArray<unknown>
		subscribeChanges: (callback: () => void) => unknown
	},
	parseRow: (row: unknown) => unknown
): void {
	try {
		const stored = localStorage.getItem(storageKey)
		if (stored !== null) {
			// Parse each row through its schema so a stale cache from an older
			// app version is discarded rather than seeded as bad data.
			const rows = (JSON.parse(stored) as Array<unknown>).map(parseRow)
			queryClient.setQueryData(queryKey, rows)
		}
	} catch (error) {
		console.warn(`[local-cache] discarding unreadable ${storageKey}`, error)
		localStorage.removeItem(storageKey)
	}

	collection.subscribeChanges(() => {
		try {
			localStorage.setItem(storageKey, JSON.stringify(collection.toArray))
		} catch (error) {
			console.warn(`[local-cache] could not save ${storageKey}`, error)
		}
	})
}

mirrorToLocalStorage(
	'sunlo-cache-profile',
	myProfileQuery.queryKey,
	myProfileCollection,
	(row) => MyProfileSchema.parse(row)
)

// queryKey must match decksCollection in src/features/deck/collections.ts
mirrorToLocalStorage(
	'sunlo-cache-decks',
	['user', 'deck_plus'],
	decksCollection,
	(row) => DeckMetaSchema.parse(row)
)
