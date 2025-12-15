import { eq, useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'
import { commentPhrasesCollection, commentsCollection } from '@/lib/collections'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import type { uuid } from '@/types/main'
import { phrasesFull } from '@/lib/live-collections'
import { Loader } from '@/components/ui/loader'
import { WithPhrase } from '@/components/with-phrase'

interface AnswersOnlyViewProps {
	requestId: uuid
}

export function AnswersOnlyView({ requestId }: AnswersOnlyViewProps) {
	// Get all comment-phrase links for this request
	const { data: commentPhrases, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhrasesCollection })
				.join(
					{ phrase: phrasesFull },
					({ link, phrase }) => eq(link.phrase_id, phrase.id),
					'inner'
				)
				.join({ comment: commentsCollection }, ({ link, comment }) =>
					eq(link.comment_id, comment.id)
				)
				.where(({ link }) => eq(link.request_id, requestId)),
		[requestId]
	)

	// Filter and deduplicate phrase IDs for this request
	const phrasesIds = useMemo(() => {
		return Array.from(new Set(commentPhrases.map((p) => p.phrase.id)))
	}, [commentPhrases])

	if (isLoading) return <Loader />
	if (phrasesIds.length === 0) {
		return (
			<div className="text-muted-foreground py-8 text-center">
				<p>No answers have been proposed yet.</p>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			<p className="text-muted-foreground text-sm">
				Showing all {phrasesIds.length} flashcard
				{phrasesIds.length !== 1 ? 's' : ''} from comments
			</p>
			<div className="grid gap-3">
				{phrasesIds.map((pid) => (
					<div key={pid} className="rounded-lg border p-3">
						<WithPhrase pid={pid} Component={CardResultSimple} />
					</div>
				))}
			</div>
		</div>
	)
}
