import { createLiveQueryCollection, eq } from '@tanstack/db'
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
			.fn.select(({ phrase, profile }) => ({
				...phrase,
				profile,
				searchableText: [
					phrase.text,
					...(phrase.translations?.map((t) => t.text) ?? []),
					...(phrase.tags ?? []).map((t) => t.name),
				].join(', '),
			})),
})
