import type { UseMutationResult } from '@tanstack/react-query'
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

export function DeleteCommentDialog({
	mutation,
}: {
	mutation: UseMutationResult<void, Error, void, unknown>
}) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	return (
		<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
			<Button
				variant="ghost"
				size="icon"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={() => setDeleteDialogOpen(true)}
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
