import { BTreeIndex, createLiveQueryCollection, eq } from '@tanstack/db'
import { createFriendSummaries } from './friend-summary-fold'
import { friendRequestActionsCollection } from './collections'
import {
	myProfileCollection,
	publicProfilesCollection,
} from '@/features/profile/collections'
import type { FriendSummaryType } from './schemas'
import type { PublicProfileType } from '@/features/profile/schemas'

/** Every pair the signed-in user belongs to, with its current status. */
export const friendSummaries = createFriendSummaries(
	friendRequestActionsCollection,
	myProfileCollection
)

// A live query collection cannot take `autoIndex`, so the two fields consumers
// look rows up by are indexed here — `uid` for the join in `useOnePublicProfile`
// and `status` for the friends filters.
friendSummaries.createIndex((row) => row.uid, { indexType: BTreeIndex })
friendSummaries.createIndex((row) => row.status, { indexType: BTreeIndex })

export type RelationsFullType = FriendSummaryType & {
	isMostRecentByMe: boolean
	profile: PublicProfileType
}

export const relationsFull = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ relation: friendSummaries })
			.join(
				{ profile: publicProfilesCollection },
				({ relation, profile }) => eq(relation.uid, profile.uid),
				'inner'
			)
			.fn.select(({ relation, profile }) => ({
				...relation,
				isMostRecentByMe: relation.most_recent_uid_for === relation.uid,
				profile,
			})),
})
