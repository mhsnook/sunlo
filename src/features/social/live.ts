import { createLiveQueryCollection, eq } from '@tanstack/db'
import { friendSummariesCollection } from './collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import type { FriendSummaryType } from './schemas'
import type { PublicProfileType } from '@/features/profile/schemas'

export type RelationsFullType = FriendSummaryType & {
	isMostRecentByMe: boolean
	profile: PublicProfileType
}

export const relationsFull = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ relation: friendSummariesCollection })
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
