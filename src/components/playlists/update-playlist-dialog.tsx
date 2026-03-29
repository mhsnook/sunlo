import { useState } from 'react'
import { Edit } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
	PhrasePlaylistUpdateSchema,
	type PhrasePlaylistType,
	type PhrasePlaylistUpdateType,
} from '@/features/playlists/schemas'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { phrasePlaylistsCollection } from '@/features/playlists/collections'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { CoverImageField } from '@/components/fields/cover-image-field'
import { isEmbeddableUrl } from './playlist-embed'

export function UpdatePlaylistDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)

	const form = useForm<PhrasePlaylistUpdateType>({
		resolver: zodResolver(PhrasePlaylistUpdateSchema),
		mode: 'onBlur',
		defaultValues: {
			title: playlist.title,
			description: playlist.description ?? '',
			href: playlist.href,
			cover_image_path: playlist.cover_image_path ?? null,
		},
	})

	const hrefValue = form.watch('href')
	const showCoverImage = !isEmbeddableUrl(hrefValue)

	const mutation = useMutation({
		mutationFn: async (values: PhrasePlaylistUpdateType) => {
			const { data, error } = await supabase
				.from('phrase_playlist')
				.update({
					title: values.title,
					description: values.description || null,
					href: values.href || null,
					cover_image_path: values.cover_image_path || null,
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
			console.log('Error', error)
		},
	})

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen)
				if (isOpen) {
					form.reset({
						title: playlist.title,
						description: playlist.description ?? '',
						href: playlist.href,
						cover_image_path: playlist.cover_image_path ?? null,
					})
				}
			}}
		>
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
				<form
					noValidate
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
					className="mt-2 space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="playlist-title">Title</Label>
						<Input
							id="playlist-title"
							data-testid="playlist-title-input"
							className={
								form.formState.errors.title ? 'border-red-500' : ''
							}
							{...form.register('title')}
						/>
						{form.formState.errors.title && (
							<p className="text-sm text-red-500">
								{form.formState.errors.title.message}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="playlist-description">Description</Label>
						<Textarea
							id="playlist-description"
							data-testid="playlist-description-input"
							{...form.register('description')}
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="playlist-href">Source URL</Label>
						<Input
							id="playlist-href"
							data-testid="playlist-href-input"
							type="url"
							className={
								form.formState.errors.href ? 'border-red-500' : ''
							}
							{...form.register('href')}
							placeholder="https://..."
						/>
						{form.formState.errors.href && (
							<p className="text-sm text-red-500">
								{form.formState.errors.href.message}
							</p>
						)}
					</div>
					{showCoverImage && (
						<CoverImageField
							control={form.control}
							error={form.formState.errors.cover_image_path}
						/>
					)}
					<div className="flex gap-2">
						<Button
							size="sm"
							type="submit"
							disabled={mutation.isPending || !form.formState.isValid}
							data-testid="save-playlist-button"
						>
							{mutation.isPending ? 'Saving...' : 'Save'}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							type="button"
							onClick={() => {
								setOpen(false)
								form.reset()
							}}
						>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
