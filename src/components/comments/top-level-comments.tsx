import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import { commentsCollection } from '@/lib/collections'
import { CommentWithReplies } from './comment-with-replies'
import type { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'

interface CommentListProps {
	requestId: uuid
	lang: string
}

function useTopLevelComments(requestId: uuid) {
	return useLiveQuery(
		(q) =>
			q
				.from({ comment: commentsCollection })
				.where(({ comment }) =>
					and(
						eq(comment.request_id, requestId),
						isNull(comment.parent_comment_id)
					)
				)
				.orderBy(({ comment }) => comment.upvote_count, 'desc'),
		[requestId]
	)
}

export function TopLevelComments({ requestId, lang }: CommentListProps) {
	// Get comments for this request, sorted by upvote count
	const { data: comments, isLoading } = useTopLevelComments(requestId)

	if (isLoading) return <Loader />
	if (!comments || comments.length === 0) {
		return (
			<div className="text-muted-foreground py-8 text-center">
				<p>No comments yet. Be the first to comment!</p>
			</div>
		)
	}

	return (
		<div className="divide-y">
			{comments.map((comment) => (
				<CommentWithReplies key={comment.id} comment={comment} lang={lang} />
			))}
		</div>
	)
}
