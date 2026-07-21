import { failed } from '@scenetest/checks/react'
import { queryClient } from '@/lib/query-client'
import { myProfileCollection } from '@/features/profile/collections'
import { decksCollection, cardsCollection } from '@/features/deck/collections'
import { friendSummariesCollection } from '@/features/social/collections'
import { resetUiPrefs } from '@/lib/ui-prefs'
import {
	PERSISTED_COLLECTIONS,
	attachMirror,
	hydrateFromStorage,
	clearPersistedUserData,
	hasSupabaseSessionToken,
} from '@/lib/collections/local-cache'

/**
 * Force-reload a collection the shell needs before render. preload() loads a
 * cold or cleaned-up collection; but profile and decks are kept syncing
 * logged-out by their localStorage mirror, so they can be parked `ready` but
 * empty — preload() no-ops on `ready`, so cleanup()+preload() forces a fresh
 * sync. Safe because this runs in the _user loader before the shell mounts, so
 * no live query depends on the collection (the mirror's plain subscription
 * doesn't poison).
 */
const reloadFresh = async (c: {
	size: number
	preload: () => Promise<unknown>
	cleanup: () => Promise<unknown>
}): Promise<void> => {
	await c.preload()
	if (c.size === 0) {
		await c.cleanup()
		await c.preload()
	}
}

/**
 * The auth lifecycle as a single unit: three named operations for the
 * timing-sensitive moments around an identity change. Each method's name says
 * *when* it runs; the loader's failed() check encodes the invariant that must
 * hold after a login.
 */
class AuthLifecycle {
	/**
	 * `bootstrap` phase — called once from main.tsx before React renders.
	 * Wires the localStorage mirror listeners *unconditionally* so a visitor
	 * who logs in this page session still persists future changes (bootstrap
	 * doesn't run a second time on login); hydrates the React Query cache
	 * from storage only if a Supabase token is already present.
	 */
	registerPersistedMirrorsAtBootstrap(): void {
		const hasSession = hasSupabaseSessionToken()
		const restored: Record<string, number> = {}
		for (const entry of PERSISTED_COLLECTIONS) {
			attachMirror(entry)
			restored[entry.label] = hasSession ? hydrateFromStorage(entry) : 0
		}
		if (hasSession) {
			console.log(
				'App bootstrap: found Supabase session; restored from cache:',
				restored
			)
		} else {
			console.log('App bootstrap: no Supabase session in localStorage')
		}
	}

	/**
	 * Fires on every identity change (sign-out, switch, first-login).
	 *
	 * Sign-out hard-reloads to a clean logged-out page. A full reload tears down
	 * every collection and live query at once, so there's nothing to surgically
	 * clear in memory — and none of the cleanup()-while-subscribed live-query
	 * poisoning a soft clear risks. The localStorage wipes run first so the
	 * reloaded page can't repaint the previous user.
	 *
	 * Login just drops any logged-out ['user'] queries so the _user loader
	 * refetches authenticated.
	 */
	clearAllUserDataOnIdentityChange(nextUserId: string | null): void {
		console.log('Identity change: clearing local cache')
		resetUiPrefs()
		clearPersistedUserData()
		if (!nextUserId) {
			window.location.assign('/')
			return
		}
		queryClient.removeQueries({ queryKey: ['user'] })
	}

	/**
	 * _user route loader. Force-reloads what the shell renders with (profile,
	 * decks) before it mounts. notifications loads itself when the navbar bell's
	 * live query subscribes; friendSummaries gets a warm-up; the rest reload via
	 * their own route loaders. The failed()/throw is the contract: an empty
	 * profile here means handle_new_user didn't run.
	 */
	async loadAllTheRequiredUserDataAfterNewLogin(userId: string): Promise<void> {
		await Promise.all([
			reloadFresh(myProfileCollection),
			reloadFresh(decksCollection),
		])

		if (myProfileCollection.size === 0) {
			failed(
				'missing user_profile row — handle_new_user trigger / backfill did not run for this account',
				{ userId }
			)
			console.error(
				`No user_profile row for authenticated user ${userId} — ` +
					`the handle_new_user trigger or backfill did not run for this account.`
			)
			throw new Error(
				"We couldn't load your account profile. Try refreshing the page — if this keeps happening, please contact support."
			)
		}

		void friendSummariesCollection.preload()
		// Deck stats (card counts, most_recent_review_at) are derived from
		// cardsCollection client-side now, and the nav switcher + /learn activity
		// sort render outside $lang routes — so load cards app-wide, not just per
		// deck. Non-blocking: the shell renders on profile+decks; stats fill in.
		void cardsCollection.preload()
	}
}

export const authLifecycle = new AuthLifecycle()
