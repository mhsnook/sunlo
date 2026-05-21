import { queryClient } from '@/lib/query-client'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { MyProfileSchema } from '@/features/profile/schemas'

/**
 * Local persistence for user-owned collections — for now, only the profile.
 *
 * This is a sidecar cache, never a source of truth. It exists so a returning
 * user sees their profile on the first paint, before the network round trip.
 * Supabase stays authoritative and overwrites it on revalidation.
 *
 * The two functions here are lifecycle hooks. The wider app lifecycle is a
 * confidence ladder — each phase is more certain about who the user is and
 * whether the on-screen data is real (most of it lives in auth-context):
 *
 *   bootstrap     — entry script, before React renders. Identity and data are
 *                   both guesses read from localStorage.
 *                   → restorePersistedUserData()
 *   supabase-init — the client has confirmed the session (getSession() or an
 *                   onAuthStateChange event, whichever wins the race). Identity
 *                   known; data still the unvalidated guess. → auth-context isLoaded
 *   data-loaded   — user data fetched and validated; now we're sure.
 *                   → auth-context isReady
 *   confirm-quit  — sign-out edge; make all non-public local data gone.
 *                   → clearPersistedUserData()
 *
 * Only the `bootstrap` and `confirm-quit` hooks belong to this module today.
 */

// localStorage key holding the cached profile rows.
const PROFILE_CACHE_KEY = 'sunlo-cache-profile'

/**
 * Synchronous, network-free guess at "is someone logged in on this device" —
 * just the presence of a Supabase auth token in localStorage. Lets the
 * `bootstrap` phase decide whether to bother restoring, before `supabase-init`
 * confirms the session. The project ref varies (local vs prod) so we match the
 * `sb-<ref>-auth-token` shape rather than reconstructing the exact key.
 */
function hasSupabaseSessionToken(): boolean {
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

/**
 * `bootstrap` phase (entry script, before React renders): if this device looks
 * logged in, prime the React Query cache from localStorage so the profile
 * paints before any network call, then mirror future collection changes back.
 * The restored rows are unvalidated — `supabase-init` revalidates them. No-op
 * for a logged-out visitor.
 */
export function restorePersistedUserData(): void {
	if (!hasSupabaseSessionToken()) return

	try {
		const stored = localStorage.getItem(PROFILE_CACHE_KEY)
		if (stored !== null) {
			// Validate through the schema so a cache written by an older app
			// version is discarded rather than seeded as bad data.
			const rows = (JSON.parse(stored) as Array<unknown>).map((row) =>
				MyProfileSchema.parse(row)
			)
			queryClient.setQueryData(myProfileQuery.queryKey, rows)
		}
	} catch (error) {
		console.warn(
			`[local-cache] discarding unreadable ${PROFILE_CACHE_KEY}`,
			error
		)
		localStorage.removeItem(PROFILE_CACHE_KEY)
	}

	myProfileCollection.subscribeChanges(() => {
		try {
			localStorage.setItem(
				PROFILE_CACHE_KEY,
				JSON.stringify(myProfileCollection.toArray)
			)
		} catch (error) {
			console.warn(`[local-cache] could not save ${PROFILE_CACHE_KEY}`, error)
		}
	})
}

/**
 * `confirm-quit` phase (sign-out): drop everything this module persisted so a
 * different user on the same device can't read the previous user's data.
 */
export function clearPersistedUserData(): void {
	localStorage.removeItem(PROFILE_CACHE_KEY)
}
