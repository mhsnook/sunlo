import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { PhraseFullSchema } from '@/lib/schemas'
import {
	phrasePlaylistsCollection,
	phrasesCollection,
	playlistPhraseLinksCollection,
} from '@/lib/collections'
import { Trash } from 'lucide-react'

export const Route = createFileRoute('/_user/learn/$lang/playlists/new')({
	component: RouteComponent,
})

type CreatePlaylistRPCReturnType = {
	playlist: Tables<'phrase_playlist'>
	links: Tables<'playlist_phrase_link'>[]
	new_phrases: Tables<'phrase'>[]
}

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath })
	const { lang } = Route.useParams()

	const form = useForm<PhrasePlaylistInsertType>({
		resolver: zodResolver(PhrasePlaylistInsertSchema),
		defaultValues: {
			title: '',
			description: '',
			href: null,
			phrases: [] as {
				phrase_id: string
				href: string | null
			}[],
		},
	})

	const mutation = useMutation({
		mutationKey: ['createPlaylist'],
		mutationFn: async ({ phrases, ...values }: PhrasePlaylistInsertType) => {
			// give the phrases array its order values
			phrases = phrases.map((p, i) => ({ ...p, order: i }))
			// API call
			const { data } = await supabase
				.rpc('create_playlist_with_links', {
					...values,
					phrases,
					lang,
				})
				.throwOnError()
			return data as CreatePlaylistRPCReturnType
		},
		onSuccess: (data) => {
			// update local collections with all new rows
			phrasePlaylistsCollection.utils.writeInsert(
				PhrasePlaylistSchema.parse(data.playlist)
			)
			data.new_phrases.forEach((phrase) =>
				phrasesCollection.utils.writeInsert(PhraseFullSchema.parse(phrase))
			)
			data.links.forEach((link) =>
				playlistPhraseLinksCollection.utils.writeInsert(
					PlaylistPhraseLinkSchema.parse(link)
				)
			)
			toast.success(
				`Added new playlist with ${data.links.length} flashcards, ${data.new_phrases.length} new phrases}`
			)
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

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'phrases',
	})

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
					<Label htmlFor="title">Title</Label>
					<Input
						id="title"
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
					<Label>Phrases</Label>
					{fields.map((field, index) => (
						<div
							key={field.id}
							className="flex items-center gap-2 rounded border bg-gray-50 p-2"
						>
							{/* TODO: Replace this input with your Phrase Picker/Linker component */}
							<Input
								{...form.register(`phrases.${index}.phrase_id`)}
								placeholder="Select a phrase..."
							/>
							<Button
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => remove(index)}
								variant="destructive-outline"
								size="icon"
							>
								<Trash />
							</Button>
						</div>
					))}
					<Button
						variant="dashed-w-full"
						className={fields.length ? '' : 'h-24'}
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => append({ phrase_id: '', href: null })}
					>
						{fields.length ?
							'+ Add another phrase'
						:	'No phrases added yet. Click here to get started'}
					</Button>
				</div>

				<div className="flex justify-end gap-4 pt-4">
					<Button
						// oxlint-disable-next-line jsx-no-new-function-as-prop
						onClick={() => window.history.back()}
						variant="secondary"
					>
						Cancel
					</Button>
					<Button type="submit">Create Playlist</Button>
				</div>
			</form>
		</div>
	)
}
