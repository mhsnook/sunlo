import { useState } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { Trash2 } from 'lucide-react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { RequestCommentType } from '@/features/comments/schemas'
import { commentsCollection } from '@/features/comments/collections'

export function DeleteCommentDialog({
	comment,
}: {
	comment: RequestCommentType
}) {
	const [open, setOpen] = useState(false)

	const deleteComment = () => {
		setOpen(false)
		const tx = commentsCollection.delete(comment.id)
		tx.isPersisted.promise.then(
			() => toastSuccess('Comment deleted'),
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to delete comment: ${message}`)
			}
		)
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Delete comment"
				data-testid="delete-comment-button"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			<AlertDialogContent data-testid="delete-comment-dialog">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete comment?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete your comment and all its replies. This
						action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={deleteComment}
						className="bg-destructive text-destructive-foreground"
						data-testid="confirm-delete-comment-button"
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
