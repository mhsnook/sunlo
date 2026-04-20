import { createLiveQueryCollection, eq, not } from '@tanstack/db'
import { cardsCollection } from '@/features/deck/collections'
import { phrasesCollection } from './collections'
import { publicProfilesCollection } from '@/features/profile/collections'

export const phrasesFull = createLiveQueryCollection({
	id: 'phrases_full',
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
			}))
			.where(({ card }) => not(eq(card?.direction, 'forward'))),
})
