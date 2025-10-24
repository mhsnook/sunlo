import { createLiveQueryCollection, eq } from '@tanstack/db'
import {
	cardsCollection,
	friendSummariesCollection,
	phraseRequestsCollection,
	phrasesCollection,
	publicProfilesCollection,
} from './collections'

export const phrasesFull = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ phrase: phrasesCollection })
			.join(
				{ profile: publicProfilesCollection },
				({ phrase, profile }) => eq(phrase.added_by, profile.uid),
				'inner'
			)
			.join({ request: phraseRequestsCollection }, ({ phrase, request }) =>
				eq(phrase.request_id, request.id)
			)
			.join({ card: cardsCollection }, ({ phrase, card }) =>
				eq(phrase.id, card.phrase_id)
			)
			.fn.select(({ phrase, profile, request, card }) => ({
				...phrase,
				card,
				profile,
				request,
				searchableText: [
					phrase.text,
					...phrase.translations.map((t) => t.text),
					...(phrase.tags ?? []).map((t) => t.name),
					request?.prompt,
				].join(', '),
			})),
})

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

export const cardsFull = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ card: cardsCollection })
			.join({ phrase: phrasesCollection }, ({ card, phrase }) =>
				eq(phrase.id, card.phrase_id)
			)
			.select(({ card, phrase }) => ({ ...card, phrase })),
})
