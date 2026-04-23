import { createLiveQueryCollection, eq } from '@tanstack/db'
import { phraseRequestsCollection } from './collections'

/**
 * Phrase requests with `deleted = false` pre-filtered.
 * Use this anywhere you want the "live" set of requests visible to users.
 */
export const phraseRequestsActive = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ request: phraseRequestsCollection })
			.where(({ request }) => eq(request.deleted, false)),
})
