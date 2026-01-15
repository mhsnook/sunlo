import { useState } from 'react'
import { Edit } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
	PhrasePlaylistSchema,
	type PhrasePlaylistType,
} from '@/lib/schemas-playlist'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { phrasePlaylistsCollection } from '@/lib/collections'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'

export function UpdatePlaylistDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [editTitle, setEditTitle] = useState(playlist.title)
	const [editDescription, setEditDescription] = useState(
		playlist.description ?? ''
	)
	const [editHref, setEditHref] = useState(playlist.href ?? '')

	const [open, setOpen] = useState(false)
	// Update playlist mutation
	const mutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase
				.from('phrase_playlist')
				.update({
					title: editTitle,
					description: editDescription || null,
					href: editHref || null,
				})
				.eq('id', playlist.id)
				.select()
				.single()

			if (error) throw error
			return data
		},
		onSuccess: (data: PhrasePlaylistType) => {
			setOpen(false)
			toast.success('Playlist updated!')
			phrasePlaylistsCollection.utils.writeUpdate(
				PhrasePlaylistSchema.parse(data)
			)
		},
		onError: (error: Error) => {
			toast.error(`Failed to update playlist: ${error.message}`)
		},
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" title="Update playlist">
					<Edit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Playlist</DialogTitle>
					<DialogDescription className="sr-only">
						Edit the playlist title, description, and source URL
					</DialogDescription>
				</DialogHeader>
				<div className="mt-2 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="playlist-title">Title</Label>
						<Input
							id="playlist-title"
							value={editTitle}
							onChange={(e) => setEditTitle(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="playlist-description">Description</Label>
						<Textarea
							id="playlist-description"
							value={editDescription}
							onChange={(e) => setEditDescription(e.target.value)}
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="playlist-href">Source URL</Label>
						<Input
							id="playlist-href"
							type="url"
							value={editHref}
							onChange={(e) => setEditHref(e.target.value)}
							placeholder="https://..."
						/>
					</div>
					<div className="flex gap-2">
						<Button
							size="sm"
							onClick={() => mutation.mutate()}
							disabled={mutation.isPending || !editTitle.trim()}
						>
							{mutation.isPending ? 'Saving...' : 'Save'}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setOpen(false)
								setEditTitle(playlist.title)
								setEditDescription(playlist.description ?? '')
								setEditHref(playlist.href ?? '')
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
