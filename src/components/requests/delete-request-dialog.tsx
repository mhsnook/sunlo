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
		// Fire-and-forget: the optimistic soft-delete removes the row from
		// phraseRequestsActive immediately. Error toast lives in
		// phraseRequestsCollection.onUpdate; on rollback the row reappears.
		phraseRequestsCollection.update(request.id, (draft) => {
			draft.deleted = true
		})
		void navigate({
			to: '/learn/$lang',
			params: { lang: request.lang },
		})
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
