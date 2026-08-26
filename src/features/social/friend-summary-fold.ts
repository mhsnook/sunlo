import { concat, createLiveQueryCollection, eq, max } from '@tanstack/db'
import { STATUS_AFTER_ACTION, type FriendSummaryType } from './schemas'
import type { friendRequestActionsCollection } from './collections'
import type { myProfileCollection } from '@/features/profile/collections'

/** The key both `friend_summary` and its client-side fold use for a pair. */
export const friendPairKey = (pair: {
	uid_less: string
	uid_more: string
}): string => `${pair.uid_less}--${pair.uid_more}`

// A column reference as the query builder hands it over, not its value.
type ColumnRef = Parameters<typeof concat>[0]

/**
 * A sortable key for one action, so `max()` can pick the newest of a pair.
 *
 * `created_at` is fixed-width ISO from PostgREST, so it sorts lexically the way
 * it sorts chronologically. `id` breaks a tie between two actions stamped in
 * the same microsecond, which keeps the pick single-valued — two winners would
 * be two rows under one key. The pair columns lead so the key can be compared
 * against a group's `max()` directly; they are constant within a group, so
 * they do not affect which action wins.
 */
const actionSortKey = (action: {
	uid_less: ColumnRef
	uid_more: ColumnRef
	created_at: ColumnRef
	id: ColumnRef
}) =>
	concat(
		action.uid_less,
		'|',
		action.uid_more,
		'|',
		action.created_at,
		'|',
		action.id
	)

/**
 * Fold the friend-request action log into one summary row per pair — the same
 * shape the `friend_summary` view returns, computed locally.
 *
 * Two steps, because the query compiler aggregates values rather than picking a
 * row: group the log by pair to find each pair's winning sort key, then join
 * that key back to the action carrying it.
 *
 * `uid` is the other party, relative to the reader, which the view computes
 * from `auth.uid()`. Here the reader's own uid comes from a join to their
 * profile row — the one row `myProfileCollection` holds. A pair whose profile
 * row has not loaded yet folds to nothing rather than to a guess, and fills in
 * on its own when the profile arrives.
 *
 * Takes its sources as arguments so the fold can be exercised over plain local
 * collections — see ./friend-summary-fold.test.ts.
 */
export const createFriendSummaries = (
	actions: typeof friendRequestActionsCollection,
	me: typeof myProfileCollection
) => {
	const latestPerPair = createLiveQueryCollection({
		id: 'friend_pairs',
		query: (q) =>
			q
				.from({ action: actions })
				.groupBy(({ action }) => [action.uid_less, action.uid_more])
				.select(({ action }) => ({
					uid_less: action.uid_less,
					uid_more: action.uid_more,
					newest_action_key: max(actionSortKey(action)),
				})),
		getKey: friendPairKey,
	})

	return createLiveQueryCollection({
		id: 'friend_summaries',
		query: (q) =>
			q
				.from({ latest: latestPerPair })
				.join(
					{ action: actions },
					({ latest, action }) =>
						eq(actionSortKey(action), latest.newest_action_key),
					'inner'
				)
				.join({ meLess: me }, ({ latest, meLess }) =>
					eq(latest.uid_less, meLess.uid)
				)
				.join({ meMore: me }, ({ latest, meMore }) =>
					eq(latest.uid_more, meMore.uid)
				)
				.fn.where(({ meLess, meMore }) => !!meLess || !!meMore)
				.fn.select(
					({ action, meLess }): FriendSummaryType => ({
						uid_less: action.uid_less,
						uid_more: action.uid_more,
						uid: meLess ? action.uid_more : action.uid_less,
						status: STATUS_AFTER_ACTION[action.action_type],
						most_recent_created_at: action.created_at,
						most_recent_uid_by: action.uid_by,
						most_recent_uid_for: action.uid_for,
						most_recent_action_type: action.action_type,
					})
				),
		getKey: friendPairKey,
	})
}
