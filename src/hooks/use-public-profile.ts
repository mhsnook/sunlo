import {
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { FriendSummaryType, PublicProfileType } from '@/lib/schemas'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import { eq, ilike } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

export const useSearchProfilesByUsername = (
	query: string
): UseLiveQueryResult<PublicProfileType[]> => {
	return useLiveQuery(
		(q) =>
			!query.trim() ?
				undefined
			:	q
					.from({ profile: publicProfilesCollection })
					.where(({ profile }) => ilike(profile.username, `%${query}%`)),
		[query]
	)
}

export const useOnePublicProfile = (
	uid: uuid
): UseLiveQueryResult<
	PublicProfileType & { relation: null | FriendSummaryType }
> =>
	useLiveQuery(
		(q) =>
			q
				.from({ profile: publicProfilesCollection })
				.where(({ profile }) => eq(profile.uid, uid))
				.findOne()
				.join(
					{ relation: friendSummariesCollection },
					({ profile, relation }) => eq(relation.uid, profile.uid)
				)
				.fn.select(({ profile, relation }) => ({
					...profile,
					relation:
						!relation ? null : (
							{
								...relation,
								isMostRecentByMe: relation.most_recent_uid_for === relation.uid,
							}
						),
				})),
		[uid]
	)
