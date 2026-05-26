import { should, failed } from '@scenetest/checks-react'
import { queryClient } from '@/lib/query-client'
import {
	myProfileCollection,
	myProfileQuery,
} from '@/features/profile/collections'
import { decksCollection, cardsCollection } from '@/features/deck/collections'
import {
	cardReviewsCollection,
	reviewDaysCollection,
} from '@/features/review/collections'
import {
	friendSummariesCollection,
	chatMessagesCollection,
} from '@/features/social/collections'
import {
	commentUpvotesCollection,
	phraseRequestUpvotesCollection,
} from '@/features/requests/collections'
import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import { notificationsCollection } from '@/features/notifications/collections'
import { resetUiPrefs } from '@/lib/ui-prefs'
import {
	PERSISTED_COLLECTIONS,
	attachMirror,
	hydrateFromStorage,
	clearPersistedUserData,
	hasSupabaseSessionToken,
} from '@/lib/collections/local-cache'

/**
 * The auth lifecycle as a single unit. Three named operations cover the
 * timing-sensitive moments around an identity change. Each method's name
 * documents *when* it must run, and the inline should() / failed() checks
 * encode the *invariants* that must hold afterwards.
 *
 * Treat this as a coupled bundle: changing one method's contract is
 * expected to break the assertions in scenes until all the related code is
 * updated to match. That's the point — every empty-UI / stale-data bug
 * we've chased through this module was a violated invariant we didn't have
 * a check for.
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
	 * Fires on every identity change — sign-out, account switch, AND
	 * first-login. The first-login case matters because layout subscribers
	 * (NavUser / sidebar) sync user collections logged-out and park them
	 * `ready` with [], which would silently short-circuit later preload()s.
	 * The synchronous removeQueries plugs the cleanup-vs-preload race
	 * (cleanup()'s own removeQueries sits behind an un-awaited promise).
	 *
	 * Public collections (comments, commentPhraseLinks) are intentionally
	 * untouched — their rows are still valid for a logged-out viewer.
	 */
	async clearAllUserDataOnIdentityChange(): Promise<void> {
		console.log('Identity change: clearing user collections and local cache')
		resetUiPrefs()
		queryClient.removeQueries({ queryKey: ['user'] })
		await Promise.all([
			myProfileCollection.cleanup(),
			decksCollection.cleanup(),
			cardsCollection.cleanup(),
			reviewDaysCollection.cleanup(),
			cardReviewsCollection.cleanup(),
			friendSummariesCollection.cleanup(),
			chatMessagesCollection.cleanup(),
			commentUpvotesCollection.cleanup(),
			phraseRequestUpvotesCollection.cleanup(),
			phrasePlaylistUpvotesCollection.cleanup(),
			notificationsCollection.cleanup(),
		])
		clearPersistedUserData()

		const sizes = {
			myProfile: myProfileCollection.toArray.length,
			decks: decksCollection.toArray.length,
			cards: cardsCollection.toArray.length,
			reviewDays: reviewDaysCollection.toArray.length,
			cardReviews: cardReviewsCollection.toArray.length,
			friendSummaries: friendSummariesCollection.toArray.length,
			chatMessages: chatMessagesCollection.toArray.length,
			commentUpvotes: commentUpvotesCollection.toArray.length,
			phraseRequestUpvotes: phraseRequestUpvotesCollection.toArray.length,
			phrasePlaylistUpvotes: phrasePlaylistUpvotesCollection.toArray.length,
			notifications: notificationsCollection.toArray.length,
		}
		should(
			'all user-scoped collections are empty after identity change',
			Object.values(sizes).every((n) => n === 0),
			sizes
		)
	}

	/**
	 * Called from the _user route loader (and re-run on every navigation into
	 * the _user tree). Preloads the profile and fire-and-forgets the rest of
	 * the user-scoped collections needed by the authenticated UI.
	 *
	 * Two failed() guards encode the contract with
	 * clearAllUserDataOnIdentityChange:
	 *
	 *   - Hitting the recovery branch (size 0 after preload) means clearUser
	 *     didn't run in time before this loader ran. The recovery still
	 *     executes so prod keeps working; in scenes, failed() flags the bug.
	 *   - Falling through to the missing-profile throw with seed data
	 *     means the handle_new_user trigger / backfill didn't run for the
	 *     account. The user-facing throw stays as the prod safety net.
	 */
	async loadAllTheRequiredUserDataAfterNewLogin(userId: string): Promise<void> {
		await myProfileCollection.preload()

		if (myProfileCollection.size === 0) {
			failed(
				'profile recovery branch hit — clearAllUserDataOnIdentityChange did not clean up in time',
				{ userId }
			)
			queryClient.removeQueries({ queryKey: myProfileQuery.queryKey })
			await myProfileCollection.cleanup()
			await myProfileCollection.preload()
		}

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

		void decksCollection.preload()
		void friendSummariesCollection.preload()
		void notificationsCollection.preload()
	}
}

export const authLifecycle = new AuthLifecycle()
