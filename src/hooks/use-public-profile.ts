import {
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import type { uuid } from '@/types/main'
import { eq, ilike } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

export const useSearchProfilesByUsername = (query: string) => {
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

export const useOnePublicProfile = (uid: uuid) =>
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
