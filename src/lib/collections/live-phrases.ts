import { createLiveQueryCollection, eq } from '@tanstack/db'
import { cardsCollection } from './deck'
import { phrasesCollection } from './phrases'
import { publicProfilesCollection } from './auth'

export const phrasesFull = createLiveQueryCollection({
	query: (q) =>
		q
			.from({ phrase: phrasesCollection })
			.join(
				{ profile: publicProfilesCollection },
				({ phrase, profile }) => eq(phrase.added_by, profile.uid),
				'inner'
			)
			.join({ card: cardsCollection }, ({ phrase, card }) =>
				eq(phrase.id, card.phrase_id)
			)
			.fn.select(({ phrase, profile, card }) => ({
				...phrase,
				card,
				profile,
				searchableText: [
					phrase.text,
					...(phrase.translations?.map((t) => t.text) ?? []),
					...(phrase.tags ?? []).map((t) => t.name),
				].join(', '),
			})),
})
