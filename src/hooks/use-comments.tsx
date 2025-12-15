import type { UseLiveQueryResult, uuid } from '@/types/main'
import { commentPhrasesCollection } from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { PhraseFullFullType } from '@/lib/schemas'

export function usePhrasesFromComment(
	commentId: uuid
): UseLiveQueryResult<PhraseFullFullType[]> {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhrasesCollection })
				.where(({ link }) => eq(link.comment_id, commentId))
				.join(
					{ phrase: phrasesFull },
					({ link, phrase }) => eq(link.phrase_id, phrase.id),
					'inner'
				)
				.select(({ phrase }) => phrase),
		[commentId]
	)
}
