import { ChangeEvent, useState } from 'react'
import { Edit, ImageIcon, UploadIcon, X } from 'lucide-react'
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
import { playlistCoverUrlify } from '@/lib/hooks'
import { cn } from '@/lib/utils'

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

	const [open, setOpen] = useState(false)
	const [isUploadingImage, setIsUploadingImage] = useState(false)

	const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		if (!event.target.files || event.target.files.length === 0) return
		setIsUploadingImage(true)
		try {
			const file = event.target.files[0]
			const nameparts = file.name.split('.')
			const ext = nameparts.pop()
			const slug = nameparts.join('.').replaceAll(' ', '-')
			const timeHash = Math.round(file.lastModified * 0.000001).toString(16)
			const filename = `playlist-${slug}-${timeHash}.${ext}`

			const { data, error } = await supabase.storage
				.from('avatars')
				.upload(filename, file, { cacheControl: '3600', upsert: true })

			if (error) throw error
			setEditCoverImagePath(data.path)
			toast.success('Image uploaded')
		} catch (error) {
			toast.error('Failed to upload image')
			console.error(error)
		} finally {
			setIsUploadingImage(false)
		}
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
					<div className="space-y-2">
						<Label>Cover Image</Label>
						<label
							htmlFor="coverImageEditInput"
							className={cn(
								'group border-primary-foresoft/30 hover:border-primary hover:bg-primary/10 relative isolate flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border text-center',
								editCoverImagePath && 'h-auto'
							)}
						>
							{editCoverImagePath ?
								<div className="relative w-full">
									<img
										src={playlistCoverUrlify(editCoverImagePath)}
										alt="Cover preview"
										className="h-32 w-full rounded-2xl object-cover"
									/>
									<div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
										<UploadIcon className="mx-auto mb-1 size-5 text-white" />
										<span className="text-sm text-white">Click to replace</span>
									</div>
								</div>
							:	<div className="flex flex-col items-center justify-center py-4">
									{isUploadingImage ?
										<span className="text-muted-foreground text-sm">
											Uploading...
										</span>
									:	<>
											<ImageIcon className="text-muted-foreground mx-auto mb-1 size-5" />
											<span className="text-muted-foreground text-xs">
												Click to upload a cover image
											</span>
										</>
									}
								</div>
							}
							<Input
								className="absolute inset-0 z-50 h-full cursor-pointer opacity-0"
								type="file"
								id="coverImageEditInput"
								accept="image/*"
								onChange={(e) => void handleImageUpload(e)}
								disabled={isUploadingImage}
							/>
						</label>
						{editCoverImagePath && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setEditCoverImagePath('')}
								className="text-muted-foreground hover:text-destructive"
							>
								<X className="mr-1 h-4 w-4" />
								Remove image
							</Button>
						)}
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
								setEditCoverImagePath(playlist.cover_image_path ?? '')
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
