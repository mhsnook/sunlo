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
	PhrasePlaylistUpdateSchema,
	type PhrasePlaylistType,
	type PhrasePlaylistUpdateType,
} from '@/features/playlists/schemas'
import { phrasePlaylistsCollection } from '@/features/playlists/collections'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { CoverImageField } from '@/components/fields/cover-image-field'
import { isEmbeddableUrl } from './playlist-embed'
import { useAppForm } from '@/components/form'

function playlistDefaults(
	playlist: PhrasePlaylistType
): PhrasePlaylistUpdateType {
	return {
		title: playlist.title,
		description: playlist.description ?? '',
		href: playlist.href,
		cover_image_path: playlist.cover_image_path ?? null,
	}
}

export function UpdatePlaylistDialog({
	playlist,
}: {
	playlist: PhrasePlaylistType
}) {
	const [open, setOpen] = useState(false)

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

	const form = useAppForm({
		defaultValues: playlistDefaults(playlist),
		validators: { onChange: PhrasePlaylistUpdateSchema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value)
		},
	})

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen)
				if (isOpen) {
					form.reset(playlistDefaults(playlist))
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
					data-testid="edit-playlist-form"
					noValidate
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						void form.handleSubmit()
					}}
					className="mt-2 space-y-4"
				>
					<form.AppField name="title">
						{(field) => <field.TextInput label="Title" />}
					</form.AppField>
					<form.AppField name="description">
						{(field) => <field.TextareaInput label="Description" rows={3} />}
					</form.AppField>
					<form.AppField name="href">
						{(field) => (
							<field.TextInput
								label="Source URL"
								type="url"
								placeholder="https://..."
							/>
						)}
					</form.AppField>

					<form.Subscribe selector={(s) => s.values.href}>
						{(href) =>
							isEmbeddableUrl(href) ? null : (
								<form.AppField name="cover_image_path">
									{() => <CoverImageField />}
								</form.AppField>
							)
						}
					</form.Subscribe>

					<div className="flex gap-2">
						<form.AppForm>
							<form.SubmitButton size="sm" pendingText="Saving...">
								Save
							</form.SubmitButton>
						</form.AppForm>
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
