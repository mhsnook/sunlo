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
import { PhraseRequestType } from '@/features/requests/schemas'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { useNavigate } from '@tanstack/react-router'

export function DeleteRequestDialog({
	request,
}: {
	request: PhraseRequestType
}) {
	const [open, setOpen] = useState(false)
	const navigate = useNavigate()

	const deleteRequest = () => {
		setOpen(false)
		const tx = phraseRequestsCollection.update(request.id, (draft) => {
			draft.deleted = true
		})
		tx.isPersisted.promise.then(
			() => {
				toastSuccess('Request deleted')
				void navigate({
					to: '/learn/$lang',
					params: { lang: request.lang },
				})
			},
			(err: unknown) => {
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Failed to delete request: ${message}`)
			}
		)
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Delete request"
				data-name="delete-request-button"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			<AlertDialogContent data-testid="delete-request-dialog">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete request?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete your request and all its comments. This
						action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={deleteRequest}
						data-testid="confirm-delete-button"
						className="bg-destructive text-destructive-foreground"
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
