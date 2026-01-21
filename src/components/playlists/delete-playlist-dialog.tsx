import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { PhrasePlaylistType } from '@/lib/schemas-playlist'
import supabase from '@/lib/supabase-client'
import { phrasePlaylistsCollection } from '@/lib/collections'
import { useNavigate } from '@tanstack/react-router'

export function DeletePlaylistDialog({
	playlist,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: {
	playlist: PhrasePlaylistType
	open?: boolean
	onOpenChange?: (open: boolean) => void
}) {
	const [internalOpen, setInternalOpen] = useState(false)
	const open = controlledOpen ?? internalOpen
	const setOpen = controlledOnOpenChange ?? setInternalOpen
	const navigate = useNavigate()

	// Delete playlist mutation
	const mutation = useMutation({
		mutationFn: async () => {
			const { error } = await supabase
				.from('phrase_playlist')
				.update({ deleted: true })
				.eq('id', playlist.id)

			if (error) throw error
		},
		onSuccess: () => {
			phrasePlaylistsCollection.utils.writeDelete(playlist.id)
			toastSuccess('Playlist deleted')
			// Navigate away from the deleted playlist page
			void navigate({
				to: '/learn/$lang',
				params: { lang: playlist.lang },
			})
		},
		onError: (error: Error) => {
			toastError(`Failed to delete playlist: ${error.message}`)
		},
	})
	const isControlled = controlledOpen !== undefined

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			{!isControlled && (
				<Button
					variant="ghost"
					size="icon"
					title="Delete playlist"
					onClick={() => setOpen(true)}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			)}
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete playlist?</AlertDialogTitle>
					<AlertDialogDescription>
						This will permanently delete your playlist and all its phrase links.
						This action cannot be undone.
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
