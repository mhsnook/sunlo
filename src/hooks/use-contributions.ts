import { phraseRequestsCollection } from '@/lib/collections/requests'
import { phrasesFull } from '@/lib/collections/live-phrases'
import type { PhraseFullFullType } from '@/lib/schemas/phrases'
import type { PhraseRequestType } from '@/lib/schemas/requests'
import { UseLiveQueryResult, uuid } from '@/types/main'
import { eq } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'

export function useAnyonesPhraseRequests(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<PhraseRequestType[]> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ request: phraseRequestsCollection })
				.where(({ request }) => eq(request.requester_uid, uid))
			if (lang) query = query.where(({ request }) => eq(request.lang, lang))
			return query.orderBy(({ request }) => request.created_at, 'desc')
		},
		[lang, uid]
	)
}
export function useAnyonesPhrases(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<PhraseFullFullType[]> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.added_by, uid))
			if (lang) query = query.where(({ phrase }) => eq(phrase.lang, lang))

			return query.orderBy(({ phrase }) => phrase.created_at, 'desc')
		},
		[lang, uid]
	)
}
