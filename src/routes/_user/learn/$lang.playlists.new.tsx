import { CSSProperties, useState } from 'react'
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
import { Trash, ChevronUp, ChevronDown, Link as LinkIcon } from 'lucide-react'
import { SelectPhrasesForComment } from '@/components/comments/select-phrases-for-comment'
import { PhraseTinyCard } from '@/components/cards/phrase-tiny-card'
import { useInvalidateFeed } from '@/hooks/use-feed'
import languages from '@/lib/languages'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { RequireAuth, useIsAuthenticated } from '@/components/require-auth'

export const Route = createFileRoute('/_user/learn/$lang/playlists/new')({
	component: NewPlaylistPage,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Add ${languages[lang]} Playlist`,
		},
	}),
})

type CreatePlaylistRPCReturnType = {
	playlist: Tables<'phrase_playlist'>
	links: Tables<'playlist_phrase_link'>[]
}

type PhraseWithHref = {
	phrase_id: string
	href: string | null
}

const style = { viewTransitionName: `main-area` } as CSSProperties

// Outer component handles auth check
function NewPlaylistPage() {
	const isAuth = useIsAuthenticated()

	// Require auth to create playlists
	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to create playlists.">
				<div />
			</RequireAuth>
		)
	}

	return <NewPlaylistPageContent />
}

// Inner component contains all the hooks - only rendered when authenticated
function NewPlaylistPageContent() {
	const navigate = useNavigate({ from: Route.fullPath })
	const { lang } = Route.useParams()

	// Track selected phrases with their hrefs
	const [selectedPhrases, setSelectedPhrases] = useState<PhraseWithHref[]>([])

	const form = useForm<PhrasePlaylistInsertType>({
		resolver: zodResolver(PhrasePlaylistInsertSchema),
		defaultValues: {
			title: '',
			description: '',
			href: null,
			phrases: [],
		},
	})

	const invalidateFeed = useInvalidateFeed()
	const mutation = useMutation({
		mutationKey: ['createPlaylist'],
		mutationFn: async (values: PhrasePlaylistInsertType) => {
			// Build phrases array with order values
			const phrasesWithOrder = selectedPhrases.map((p, i) => ({
				phrase_id: p.phrase_id,
				href: p.href,
				order: i,
			}))
			// API call
			const { data } = await supabase
				.rpc('create_playlist_with_links', {
					title: values.title,
					description: values.description,
					href: values.href ?? undefined,
					phrases: phrasesWithOrder,
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
			data.links.forEach((link) =>
				playlistPhraseLinksCollection.utils.writeInsert(
					PlaylistPhraseLinkSchema.parse(link)
				)
			)
			invalidateFeed(lang)
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

	// Handle phrase selection from the picker
	const handleSelectionChange = (phraseIds: string[]) => {
		setSelectedPhrases((current) => {
			// Keep existing phrases that are still selected, preserving their hrefs
			const existingMap = new Map(current.map((p) => [p.phrase_id, p]))
			return phraseIds.map(
				(id) => existingMap.get(id) ?? { phrase_id: id, href: null }
			)
		})
	}

	const removePhrase = (phraseId: string) => {
		setSelectedPhrases((phrases) =>
			phrases.filter((p) => p.phrase_id !== phraseId)
		)
	}

	const movePhrase = (index: number, direction: 'up' | 'down') => {
		setSelectedPhrases((phrases) => {
			const newPhrases = [...phrases]
			const targetIndex = direction === 'up' ? index - 1 : index + 1
			if (targetIndex < 0 || targetIndex >= phrases.length)
				return phrases
				// Swap
			;[newPhrases[index], newPhrases[targetIndex]] = [
				newPhrases[targetIndex],
				newPhrases[index],
			]
			return newPhrases
		})
	}

	const updatePhraseHref = (phraseId: string, href: string) => {
		setSelectedPhrases((phrases) =>
			phrases.map((p) =>
				p.phrase_id === phraseId ? { ...p, href: href || null } : p
			)
		)
	}

	// Extract just the IDs for the picker component
	const selectedPhraseIds = selectedPhrases.map((p) => p.phrase_id)

	return (
		<main style={style}>
			<Card>
				<CardHeader>
					<CardTitle>Create New Playlist</CardTitle>
					<CardDescription>
						A group of flash cards that go together. Optional: Link to a podcast
						or video.
					</CardDescription>
				</CardHeader>
				<CardContent>
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
							<div className="w-full">
								<Label>Phrases ({selectedPhrases.length})</Label>
							</div>

							{/* Display selected phrases with reorder and href controls */}
							{selectedPhrases.map((phrase, index) => (
								<div
									key={phrase.phrase_id}
									className="bg-muted/30 rounded border p-3"
								>
									<div className="flex items-start gap-2">
										{/* Reorder buttons */}
										<div className="flex flex-col gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												disabled={index === 0}
												onClick={() => movePhrase(index, 'up')}
											>
												<ChevronUp className="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												disabled={index === selectedPhrases.length - 1}
												onClick={() => movePhrase(index, 'down')}
											>
												<ChevronDown className="h-4 w-4" />
											</Button>
										</div>

										{/* Phrase card */}
										<div className="min-w-0 flex-1">
											<PhraseTinyCard pid={phrase.phrase_id} nonInteractive />

											{/* Href input for timestamp */}
											<div className="mt-2 flex items-center gap-2">
												<LinkIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
												<Input
													type="url"
													placeholder="Timestamp link (optional)"
													value={phrase.href ?? ''}
													onChange={(e) =>
														updatePhraseHref(phrase.phrase_id, e.target.value)
													}
													className="h-8 text-sm"
												/>
											</div>
										</div>

										{/* Delete button */}
										<Button
											type="button"
											onClick={() => removePhrase(phrase.phrase_id)}
											variant="destructive-outline"
											size="icon"
										>
											<Trash className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}

							{/* Phrase picker with inline creation */}
							<SelectPhrasesForComment
								lang={lang}
								selectedPhraseIds={selectedPhraseIds}
								onSelectionChange={handleSelectionChange}
								maxPhrases={null}
								triggerText={
									selectedPhrases.length ? '+ Add more phrases' : (
										'Add phrases to your playlist'
									)
								}
							/>
						</div>

						<div className="flex justify-end gap-4 pt-4">
							<Button
								type="button"
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
									selectedPhrases.length === 0
								}
							>
								{mutation.isPending ? 'Creating...' : 'Create Playlist'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
