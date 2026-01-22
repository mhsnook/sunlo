import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { MutationButton } from '@/components/ui/mutation-button'
import { PhrasePlaylistType } from '@/lib/schemas-playlist'
import supabase from '@/lib/supabase-client'
import { phrasePlaylistsCollection } from '@/lib/collections'
import { useNavigate } from '@tanstack/react-router'
import { useMutationWithFeedback } from '@/hooks/use-mutation-feedback'

export function DeletePlaylistDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)
	const navigate = useNavigate()

	// Delete playlist mutation with visual feedback
	const mutation = useMutationWithFeedback(
		{
			mutationFn: async () => {
				const { error } = await supabase
					.from('phrase_playlist')
					.update({ deleted: true })
					.eq('id', playlist.id)

				if (error) throw error
			},
			onSuccess: () => {
				phrasePlaylistsCollection.utils.writeDelete(playlist.id)
				// Navigate away from the deleted playlist page
				void navigate({
					to: '/learn/$lang',
					params: { lang: playlist.lang },
				})
			},
		},
		{
			successMessage: 'Playlist deleted',
			errorMessage: (error) => `Failed to delete playlist: ${error.message}`,
			enableRetry: true,
		}
	)
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
					<MutationButton
						onClick={() => mutation.mutate()}
						variant="destructive"
						{...mutation.buttonProps}
					>
						Delete
					</MutationButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
