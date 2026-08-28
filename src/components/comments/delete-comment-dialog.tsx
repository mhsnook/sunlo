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
import { RequestCommentType } from '@/features/requests/schemas'
import { useCommentPhraseLinks } from '@/features/requests/hooks'
import { deleteComment } from '@/features/requests/mutations'

export function DeleteCommentDialog({
	comment,
}: {
	comment: RequestCommentType
}) {
	const [open, setOpen] = useState(false)
	const { data: phraseLinks } = useCommentPhraseLinks(comment.id)

	const removeComment = () => {
		setOpen(false)
		const tx = deleteComment({
			commentId: comment.id,
			linkIds: (phraseLinks ?? []).map((link) => link.id),
		})
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
						This removes your comment and all its replies. You can't undo this.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={removeComment}
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
