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
	validateUrl,
} from '@/features/playlists/schemas'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { phrasePlaylistsCollection } from '@/features/playlists/collections'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { CoverImageEditor } from '@/components/fields/cover-image-field'
import { isEmbeddableUrl } from './playlist-embed'

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
	const [editCoverImagePath, setEditCoverImagePath] = useState(
		playlist.cover_image_path ?? ''
	)

	const [hrefError, setHrefError] = useState<string | null>(null)
	const [open, setOpen] = useState(false)

	const handleSave = () => {
		const urlError = validateUrl(editHref)
		setHrefError(urlError)
		if (urlError) return
		mutation.mutate()
	}

	// Update playlist mutation
	const mutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await supabase
				.from('phrase_playlist')
				.update({
					title: editTitle,
					description: editDescription || null,
					href: editHref || null,
					cover_image_path: editCoverImagePath || null,
				})
				.eq('id', playlist.id)
				.select()
				.single()

			if (error) throw error
			return data
		},
		onSuccess: (data: PhrasePlaylistType) => {
			setOpen(false)
			toastSuccess('Playlist updated!')
			phrasePlaylistsCollection.utils.writeUpdate(
				PhrasePlaylistSchema.parse(data)
			)
		},
		onError: (error: Error) => {
			toastError(`Failed to update playlist: ${error.message}`)
		},
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Update playlist"
					data-testid="update-playlist-button"
				>
					<Edit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent data-testid="edit-playlist-dialog">
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
							data-testid="playlist-title-input"
							value={editTitle}
							onChange={(e) => setEditTitle(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="playlist-description">Description</Label>
						<Textarea
							id="playlist-description"
							data-testid="playlist-description-input"
							value={editDescription}
							onChange={(e) => setEditDescription(e.target.value)}
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="playlist-href">Source URL</Label>
						<Input
							id="playlist-href"
							data-testid="playlist-href-input"
							type="url"
							value={editHref}
							onChange={(e) => {
								setEditHref(e.target.value)
								if (hrefError) setHrefError(validateUrl(e.target.value))
							}}
							className={hrefError ? 'border-red-500' : ''}
							placeholder="https://..."
						/>
						{hrefError && <p className="text-sm text-red-500">{hrefError}</p>}
					</div>
					{!isEmbeddableUrl(editHref) && (
						<div className="space-y-2">
							<Label>Cover Image</Label>
							<CoverImageEditor
								cover_image_path={editCoverImagePath}
								onUpload={(path) =>
									setEditCoverImagePath(path ?? '')
								}
							/>
						</div>
					)}
					<div className="flex gap-2">
						<Button
							size="sm"
							onClick={handleSave}
							disabled={mutation.isPending || !editTitle.trim()}
							data-testid="save-playlist-button"
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
								setEditCoverImagePath(playlist.cover_image_path ?? '')
								setHrefError(null)
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
