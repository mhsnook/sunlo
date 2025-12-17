import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
import { RequestCommentType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { commentsCollection } from '@/lib/collections'

export function DeleteCommentDialog({
	comment,
}: {
	comment: RequestCommentType
}) {
	const [open, setOpen] = useState(false)
	// Delete comment mutation
	const mutation = useMutation({
		mutationFn: async () => {
			const { error } = await supabase
				.from('request_comment')
				.delete()
				.eq('id', comment.id)

			if (error) throw error
		},
		onSuccess: () => {
			commentsCollection.utils.writeDelete(comment.id)
			toast.success('Comment deleted')
		},
		onError: (error: Error) => {
			toast.error(`Failed to delete comment: ${error.message}`)
		},
	})
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={() => setOpen(true)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			<AlertDialogContent>
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
						disabled={mutation.isPending}
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => mutation.mutate()}
						className="bg-destructive text-destructive-foreground"
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
