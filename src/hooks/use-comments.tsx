import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	commentPhrasesCollection,
	commentsCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { phrasesFull } from '@/lib/live-collections'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	PhraseFullFullType,
	PublicProfileType,
	RequestCommentType,
} from '@/lib/schemas'

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

export function useOneComment(commentId: uuid): UseLiveQueryResult<{
	comment: RequestCommentType
	profile: PublicProfileType
}> {
	return useLiveQuery(
		(q) =>
			q
				.from({ comment: commentsCollection })
				.where(({ comment }) => eq(comment.id, commentId))
				.join(
					{ profile: publicProfilesCollection },
					({ comment, profile }) => eq(comment.commenter_uid, profile.uid),
					'inner'
				)
				.findOne(),
		[commentId]
	)
}
