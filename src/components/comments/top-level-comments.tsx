import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import { commentsCollection } from '@/lib/collections'
import { CommentWithReplies } from './comment-with-replies'
import type { uuid } from '@/types/main'
import { Loader } from '@/components/ui/loader'
import { Link } from '@tanstack/react-router'

interface CommentListProps {
	requestId: uuid
	lang: string
}

const answersOnly = { show: 'answers-only' }

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
		<div className="my-4 space-y-3">
			<p className="text-muted-foreground text-sm">
				Showing {comments.length} comment
				{comments.length !== 1 ? 's' : ''}.{' '}
				<Link to="." className="s-link" search={answersOnly}>
					Show only proposed answers.
				</Link>
			</p>
			<div className="divide-y border">
				{comments.map((comment) => (
					<CommentWithReplies key={comment.id} comment={comment} lang={lang} />
				))}
			</div>
		</div>
	)
}
