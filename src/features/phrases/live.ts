import { createLiveQueryCollection, eq } from '@tanstack/db'
import { cardsCollection } from '@/features/deck/collections'
import { phrasesCollection } from './collections'
import { publicProfilesCollection } from '@/features/profile/collections'

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
			/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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
			.where(({ card }) => !eq(card?.direction, 'forward')),
})
