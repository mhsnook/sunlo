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
import { PhrasePlaylistType } from '@/features/playlists/schemas'
import { phrasePlaylistsCollection } from '@/features/playlists/collections'
import { useNavigate } from '@tanstack/react-router'

export function DeletePlaylistDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)
	const navigate = useNavigate()

	const handleDelete = () => {
		phrasePlaylistsCollection.delete(playlist.id)
		void navigate({
			to: '/learn/$lang',
			params: { lang: playlist.lang },
		})
	}
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Delete playlist"
				data-testid="delete-playlist-button"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			<AlertDialogContent data-testid="delete-playlist-dialog">
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
						onClick={handleDelete}
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
