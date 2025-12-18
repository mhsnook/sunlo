import { eq, useLiveQuery } from '@tanstack/react-db'
import { useMemo } from 'react'
import {
	commentPhraseLinksCollection,
	commentsCollection,
} from '@/lib/collections'
import { CardResultSimple } from '@/components/cards/card-result-simple'
import type { uuid } from '@/types/main'
import { phrasesFull } from '@/lib/live-collections'
import { Loader } from '@/components/ui/loader'
import { WithPhrase } from '@/components/with-phrase'
import { Link } from '@tanstack/react-router'

interface AnswersOnlyViewProps {
	requestId: uuid
}

const showThread = { show: 'thread' }

export function AnswersOnlyView({ requestId }: AnswersOnlyViewProps) {
	// Get all comment-phrase links for this request
	const { data: commentPhraseLinks, isLoading } = useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksCollection })
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
		return Array.from(new Set(commentPhraseLinks.map((p) => p.phrase.id)))
	}, [commentPhraseLinks])

	if (isLoading) return <Loader />
	if (phrasesIds.length === 0) {
		return (
			<div className="text-muted-foreground py-8 text-center">
				<p>No answers have been proposed yet.</p>
			</div>
		)
	}

	return (
		<div className="my-4 space-y-3">
			<p className="text-muted-foreground text-sm">
				Showing {phrasesIds.length} flashcard
				{phrasesIds.length !== 1 ? 's' : ''} suggested from comments.{' '}
				<Link to="." className="s-link" search={showThread}>
					Return to thread view.
				</Link>
			</p>
			<div className="grid divide-y border">
				{phrasesIds.map((pid) => (
					<div key={pid} className="p-4 pb-2">
						<WithPhrase pid={pid} Component={CardResultSimple} />
						<p className="text-sm">
							View in thread:{' '}
							{commentPhraseLinks
								.filter((link) => link.link.phrase_id === pid)
								.map((l, i, arr) => (
									<>
										{i > 0 && i < arr.length - 1 ? ',' : ''}
										{i === arr.length - 1 && arr.length > 1 ? ' and ' : ''}
										<Link
											key={l.link.id}
											to="."
											// oxlint-disable-next-line jsx-no-new-object-as-prop
											search={{
												show: 'thread',
												highlightComment: l.link.comment_id,
												showSubthread:
													l.comment?.parent_comment_id ?? l.link.comment_id,
											}}
											className="s-link text-sm"
										>
											here
										</Link>
									</>
								))}
							.
						</p>
					</div>
				))}
			</div>
		</div>
	)
}
