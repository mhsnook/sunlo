import { createLiveQueryCollection, eq } from '@tanstack/db'
import { friendSummariesCollection } from './social'
import { publicProfilesCollection } from './auth'
import type { FriendSummaryType } from '@/lib/schemas/social'
import type { PublicProfileType } from '@/lib/schemas/auth'

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
