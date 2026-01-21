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
import { PhrasePlaylistType } from '@/lib/schemas-playlist'
import supabase from '@/lib/supabase-client'
import { phrasePlaylistsCollection } from '@/lib/collections'
import { useNavigate } from '@tanstack/react-router'

export function DeletePlaylistDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)
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
			toast.success('Playlist deleted')
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
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				title="Delete playlist"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
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
