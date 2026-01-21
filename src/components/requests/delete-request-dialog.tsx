import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { toastError } from '@/components/ui/error-toast'
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
import { PhraseRequestType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { phraseRequestsCollection } from '@/lib/collections'
import { useNavigate } from '@tanstack/react-router'

export function DeleteRequestDialog({
	request,
}: {
	request: PhraseRequestType
}) {
	const [open, setOpen] = useState(false)
	const navigate = useNavigate()

	// Delete request mutation
	const mutation = useMutation({
		mutationFn: async () => {
			const { error } = await supabase
				.from('phrase_request')
				.update({ deleted: true })
				.eq('id', request.id)

			if (error) throw error
		},
		onSuccess: () => {
			phraseRequestsCollection.utils.writeDelete(request.id)
			toast.success('Request deleted')
			// Navigate away from the deleted request page
			void navigate({
				to: '/learn/$lang',
				params: { lang: request.lang },
			})
		},
		onError: (error: Error) => {
			toastError(`Failed to delete request: ${error.message}`)
		},
	})
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				title="Delete request"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			<AlertDialogContent>
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
						disabled={mutation.isPending}
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
