import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { Tables } from '@/types/supabase'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabase-client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	PhrasePlaylistInsertSchema,
	PhrasePlaylistInsertType,
	PhrasePlaylistSchema,
	PlaylistPhraseLinkSchema,
} from '@/lib/schemas-playlist'
import {
	phrasePlaylistsCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'
import { Trash } from 'lucide-react'
import { SelectPhrasesForComment } from '@/components/comments/select-phrases-for-comment'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'

export const Route = createFileRoute('/_user/learn/$lang/playlists/new')({
	component: NewPlaylistPage,
})

type CreatePlaylistRPCReturnType = {
	playlist: Tables<'phrase_playlist'>
	links: Tables<'playlist_phrase_link'>[]
}

// eslint-disable-next-line react-refresh/only-export-components
function NewPlaylistPage() {
	const navigate = useNavigate({ from: Route.fullPath })
	const { lang } = Route.useParams()

	// Track selected phrase IDs separately from form state for the picker
	const [selectedPhraseIds, setSelectedPhraseIds] = useState<string[]>([])

	const form = useForm<PhrasePlaylistInsertType>({
		resolver: zodResolver(PhrasePlaylistInsertSchema),
		defaultValues: {
			title: '',
			description: '',
			href: null,
			phrases: [],
		},
	})

	const mutation = useMutation({
		mutationKey: ['createPlaylist'],
		mutationFn: async ({ phrases, ...values }: PhrasePlaylistInsertType) => {
			// Build phrases array with order values from selectedPhraseIds
			const phrasesWithOrder = selectedPhraseIds.map((phrase_id, i) => ({
				phrase_id,
				href: phrases.find((p) => p.phrase_id === phrase_id)?.href ?? null,
				order: i,
			}))
			// API call
			const { data } = await supabase
				.rpc('create_playlist_with_links', {
					...values,
					phrases: phrasesWithOrder,
					lang,
					href: values.href ?? undefined,
				})
				.throwOnError()
			return data as CreatePlaylistRPCReturnType
		},
		onSuccess: (data) => {
			// update local collections with all new rows
			phrasePlaylistsCollection.utils.writeInsert(
				PhrasePlaylistSchema.parse(data.playlist)
			)
			data.links.forEach((link) =>
				playlistPhraseLinksCollection.utils.writeInsert(
					PlaylistPhraseLinkSchema.parse(link)
				)
			)
			toast.success(`Added new playlist with ${data.links.length} phrases`)
			void navigate({
				to: '/learn/$lang/playlists/$playlistId',
				params: { lang, playlistId: data.playlist.id },
			})
		},
		onError: (error) => {
			console.error(error)
			toast.error('There was an error creating your playlist')
		},
	})

	const removePhrase = (phraseId: string) => {
		setSelectedPhraseIds((ids) => ids.filter((id) => id !== phraseId))
	}

	return (
		<div className="mx-auto max-w-2xl p-4">
			<h1 className="mb-6 text-2xl font-bold">Create New Playlist</h1>

			<form
				role="form"
				noValidate
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
				className="space-y-6"
			>
				<div className="space-y-2">
					<Label htmlFor="title">Title</Label>
					<Input
						id="title"
						className={form.formState.errors.title ? 'border-red-500' : ''}
						{...form.register('title')}
						placeholder="Playlist Title"
					/>
					{form.formState.errors.title && (
						<p className="text-sm text-red-500">
							{form.formState.errors.title.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="description">Description</Label>
					<Textarea
						id="description"
						{...form.register('description')}
						placeholder="Optional description"
					/>
					<p className="text-muted-foreground text-xs">
						Describe what this playlist is about
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="href">Source Link</Label>
					<Input
						id="href"
						className={form.formState.errors.href ? 'border-red-500' : ''}
						{...form.register('href')}
						placeholder="https://youtube.com/watch?v=... or Spotify link"
					/>
					{form.formState.errors.href ?
						<p className="text-sm text-red-500">
							{form.formState.errors.href.message}
						</p>
					:	<p className="text-muted-foreground text-xs">
							Link to a video or podcast episode
						</p>
					}
				</div>

				<div className="space-y-3">
					<Label>Phrases ({selectedPhraseIds.length})</Label>

					{/* Display selected phrases */}
					{selectedPhraseIds.map((phraseId) => (
						<div
							key={phraseId}
							className="bg-muted/30 flex items-center gap-2 rounded border p-2"
						>
							<div className="flex-1">
								<PhraseTinyCard pid={phraseId} nonInteractive />
							</div>
							<Button
								type="button"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => removePhrase(phraseId)}
								variant="destructive-outline"
								size="icon"
							>
								<Trash />
							</Button>
						</div>
					))}

					{/* Phrase picker with inline creation */}
					<SelectPhrasesForComment
						lang={lang}
						selectedPhraseIds={selectedPhraseIds}
						onSelectionChange={setSelectedPhraseIds}
						maxPhrases={null}
						triggerText={
							selectedPhraseIds.length ? '+ Add more phrases' : (
								'Add phrases to your playlist'
							)
						}
					/>
				</div>

				<div className="flex justify-end gap-4 pt-4">
					<Button
						type="button"
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => window.history.back()}
						variant="secondary"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={
							mutation.isPending ||
							!form.formState.isValid ||
							selectedPhraseIds.length === 0
						}
					>
						{mutation.isPending ? 'Creating...' : 'Create Playlist'}
					</Button>
				</div>
			</form>
		</div>
	)
}
