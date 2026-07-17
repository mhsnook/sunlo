import { queryClient } from '@/lib/query-client'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { MyProfileSchema } from '@/features/profile/schemas'
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema } from '@/features/deck/schemas'
import {
	cardReviewsCollection,
	reviewSessionsCollection,
	reviewMilestonesCollection,
} from '@/features/review/collections'
import {
	CardReviewSchema,
	ReviewSessionSchema,
	ReviewMilestoneSchema,
} from '@/features/review/schemas'
import { todayString } from '@/lib/utils'

/**
 * Local persistence for user-owned collections — currently the profile and
 * decks. Both are small and slow-changing, so a localStorage mirror is a cheap
 * way to paint them on the first frame after a reload.
 *
 * This is a sidecar cache, never a source of truth. Supabase stays
 * authoritative and overwrites it on revalidation.
 *
 * The two functions here are lifecycle hooks. The wider app lifecycle is a
 * confidence ladder — each phase is more certain about who the user is and
 * whether the on-screen data is real (most of it lives in auth-context):
 *
 *   bootstrap     — entry script, before React renders. Identity and data are
 *                   both guesses read from localStorage.
 *                   → restorePersistedUserData()
 *   supabase-init — the client has reported the session via an
 *                   onAuthStateChange event. Identity known; data still
 *                   the unvalidated guess. → auth-context isLoaded
 *   data-loaded   — user data fetched and validated; now we're sure.
 *                   → route loaders (e.g. the _user loader's preload())
 *   confirm-quit  — sign-out edge; make all non-public local data gone.
 *                   → clearPersistedUserData()
 *
 * Only the `bootstrap` and `confirm-quit` hooks belong to this module today.
 */

// A user collection mirrored to localStorage. `queryKey` must match the
// collection's own queryKey in its features/*/collections.ts.
export type PersistedCollection = {
	label: string
	storageKey: string
	queryKey: ReadonlyArray<string>
	collection: {
		readonly toArray: ReadonlyArray<unknown>
		subscribeChanges: (callback: () => void) => unknown
	}
	parseRow: (row: unknown) => unknown
	// Optional reducer applied before persisting: mirror only a bounded slice of
	// an otherwise-unbounded collection. Used for the append-only review logs,
	// where we only need *today's* rows on the next cold start — never the whole
	// history. Absent → the whole `toArray` is mirrored (profile, decks).
	project?: (rows: ReadonlyArray<unknown>) => ReadonlyArray<unknown>
}

// Keep only rows belonging to the current review day (4am-cutoff `todayString`).
// Evaluated at persist time, so it always tracks the live day.
const onlyToday = (rows: ReadonlyArray<unknown>): ReadonlyArray<unknown> => {
	const today = todayString()
	return (rows as ReadonlyArray<{ day_session?: string }>).filter(
		(r) => r.day_session === today
	)
}

export const PERSISTED_COLLECTIONS: ReadonlyArray<PersistedCollection> = [
	{
		label: 'profile',
		storageKey: 'sunlo-cache-profile',
		queryKey: myProfileQuery.queryKey,
		collection: myProfileCollection,
		parseRow: (row) => MyProfileSchema.parse(row),
	},
	{
		label: 'decks',
		storageKey: 'sunlo-cache-decks',
		queryKey: ['user', 'deck_plus'],
		collection: decksCollection,
		parseRow: (row) => DeckMetaSchema.parse(row),
	},
	// Review session state, mirrored per-day so a hard refresh (or a second
	// device catching up) repaints an in-progress session — its stage, its
	// card history — on the first frame, across every language being reviewed.
	// All three project to today's rows only: the logs are append-only and grow
	// without bound, but only the current day is needed to resume.
	{
		label: 'review-sessions',
		storageKey: 'sunlo-cache-review-sessions',
		queryKey: ['user', 'user_review_session'],
		collection: reviewSessionsCollection,
		parseRow: (row) => ReviewSessionSchema.parse(row),
		project: onlyToday,
	},
	{
		label: 'review-milestones',
		storageKey: 'sunlo-cache-review-milestones',
		queryKey: ['user', 'user_review_milestone'],
		collection: reviewMilestonesCollection,
		parseRow: (row) => ReviewMilestoneSchema.parse(row),
		project: onlyToday,
	},
	{
		label: 'card-reviews',
		storageKey: 'sunlo-cache-card-reviews',
		queryKey: ['user', 'card_review'],
		collection: cardReviewsCollection,
		parseRow: (row) => CardReviewSchema.parse(row),
		project: onlyToday,
	},
]

/**
 * Synchronous, network-free guess at "is someone logged in on this device" —
 * just the presence of a Supabase auth token in localStorage. Lets the
 * `bootstrap` phase decide whether to bother restoring, before `supabase-init`
 * confirms the session. The project ref varies (local vs prod) so we match the
 * `sb-<ref>-auth-token` shape rather than reconstructing the exact key.
 */
export function hasSupabaseSessionToken(): boolean {
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true
		}
	} catch {
		// localStorage unavailable — treat as logged-out, no cache.
	}
	return false
}

export function attachMirror(entry: PersistedCollection): void {
	entry.collection.subscribeChanges(() => {
		try {
			const rows = entry.project
				? entry.project(entry.collection.toArray)
				: entry.collection.toArray
			localStorage.setItem(entry.storageKey, JSON.stringify(rows))
		} catch (error) {
			console.warn(`[local-cache] could not save ${entry.storageKey}`, error)
		}
	})
}

export function hydrateFromStorage(entry: PersistedCollection): number {
	try {
		const stored = localStorage.getItem(entry.storageKey)
		if (stored === null) return 0
		// Validate each row through its schema so a cache written by an older
		// app version is discarded rather than seeded as bad data.
		const rows = (JSON.parse(stored) as Array<unknown>).map(entry.parseRow)
		queryClient.setQueryData(entry.queryKey, rows)
		return rows.length
	} catch (error) {
		console.warn(
			`[local-cache] discarding unreadable ${entry.storageKey}`,
			error
		)
		localStorage.removeItem(entry.storageKey)
		return 0
	}
}

/**
 * `confirm-quit` phase (sign-out): drop everything this module persisted so a
 * different user on the same device can't read the previous user's data.
 */
export function clearPersistedUserData(): void {
	for (const entry of PERSISTED_COLLECTIONS) {
		localStorage.removeItem(entry.storageKey)
	}
}
