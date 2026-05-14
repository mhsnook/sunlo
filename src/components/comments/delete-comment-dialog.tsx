import { useState } from 'react'
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
import { commentsCollection } from '@/features/requests/collections'

export function DeleteCommentDialog({
	comment,
}: {
	comment: RequestCommentType
}) {
	const [open, setOpen] = useState(false)

	const deleteComment = () => {
		setOpen(false)
		// Fire-and-forget. The comment vanishes from the thread optimistically.
		// Error toast lives in commentsCollection.onDelete; on rollback the row
		// reappears.
		commentsCollection.delete(comment.id)
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
