import { useState, type CSSProperties } from 'react'
import { ExternalLink, Plus, Send, Bookmark } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { PhrasePlaylistType } from '@/features/playlists/schemas'
import { UidPermalink } from '@/components/card-pieces/user-permalink'
import { Badge, LangBadge } from '@/components/ui/badge'
import { useOnePlaylistPhrases } from '@/features/playlists/hooks'
import { SharePlaylistButton } from './share-playlist-button'
import { SendPlaylistToFriendDialog } from './send-playlist-to-friend'
import { UpvotePlaylist } from './upvote-playlist-button'
import { Link } from '@tanstack/react-router'
import { PlaylistEmbed, isEmbeddableUrl } from './playlist-embed'
import { useProfile } from '@/features/profile/hooks'
import { UpdatePlaylistDialog } from './update-playlist-dialog'
import { ManagePlaylistPhrasesDialog } from './manage-playlist-phrases-dialog'
import { DeletePlaylistDialog } from './delete-playlist-dialog'
import { playlistCoverUrlify } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { InlinePhraseCreator } from '@/components/phrases/inline-phrase-creator'
import { playlistPhraseLinksCollection } from '@/features/playlists/collections'
import { cardsCollection } from '@/features/deck/collections'
import { CardMetaSchema } from '@/features/deck/schemas'
import { useDecks } from '@/features/deck/hooks'
import { useUserId } from '@/lib/use-auth'
import supabase from '@/lib/supabase-client'
import { toastSuccess, toastError } from '@/components/ui/sonner'

export function PlaylistItem({
	playlist,
	compact = false,
}: {
	playlist: PhrasePlaylistType
	compact?: boolean
}) {
	const { data } = useOnePlaylistPhrases(playlist.id)
	const { data: profile } = useProfile()
	const userId = useUserId()
	const { data: decks } = useDecks()
	const isOwner = profile?.uid === playlist.uid
	const [showAddPhrase, setShowAddPhrase] = useState(false)
	const hasDeck = decks?.some((d) => d.lang === playlist.lang) ?? false

	const phrasesNotInDeck =
		data?.filter((item) => !item.phrase.card || item.phrase.card.status === 'skipped') ?? []

	const bulkAddMutation = useMutation({
		mutationFn: async (phraseIds: Array<string>) => {
			const { data: inserted } = await supabase
				.from('user_card')
				.upsert(
					phraseIds.map((phrase_id) => ({
						lang: playlist.lang,
						phrase_id,
						status: 'active' as const,
					})),
					{ onConflict: 'uid, phrase_id' }
				)
				.select()
				.throwOnError()
			return inserted!
		},
		onSuccess: (cards: Array<{ [key: string]: unknown }>) => {
			for (const card of cards) {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(card))
			}
			toastSuccess(`Added ${cards.length} card${cards.length === 1 ? '' : 's'} to your deck`)
		},
		onError: (error: Error) => {
			toastError('Failed to add cards to deck')
			console.log('Error', error)
		},
	})

	// Mutation to link a newly created phrase to this playlist
	const linkPhraseMutation = useMutation({
		mutationFn: async (phraseId: string) => {
			const maxOrder = Math.max(
				...(data?.map((p) => p.link.order || 0) ?? [0]),
				0
			)
			const { data: linkData, error } = await supabase
				.from('playlist_phrase_link')
				.insert({
					playlist_id: playlist.id,
					phrase_id: phraseId,
					order: maxOrder + 1,
					href: null,
				})
				.select()
				.single()
			if (error) throw error
			return linkData
		},
		onSuccess: (linkData) => {
			playlistPhraseLinksCollection.utils.writeInsert(linkData)
			toastSuccess('Phrase added to playlist')
		},
		onError: (error: Error) => {
			toastError(`Failed to link phrase: ${error.message}`)
			console.log('Error', error)
		},
	})

	return (
		<div
			style={{ viewTransitionName: `playlist-${playlist.id}` } as CSSProperties}
			className="bg-card text-card-foreground @container flex flex-col gap-3 rounded-lg border p-6 shadow-sm"
		>
			<div className="flex flex-row items-center justify-between gap-2">
				<UidPermalink
					uid={playlist.uid}
					action="created a Playlist"
					timeLinkTo="/learn/$lang/playlists/$playlistId"
					timeLinkParams={{
						lang: playlist.lang,
						playlistId: playlist.id,
					}}
					timeValue={playlist.created_at}
				/>

				<div className="flex flex-col-reverse items-end gap-2 @sm:flex-row @sm:items-center">
					{isOwner && (
						<>
							<UpdatePlaylistDialog playlist={playlist} />
							<ManagePlaylistPhrasesDialog playlist={playlist} />
							<DeletePlaylistDialog playlist={playlist} />
						</>
					)}
					<Badge variant="outline" className="whitespace-nowrap">
						{data?.length ?? 0} phrase
						{data?.length === 1 ? '' : 's'}
					</Badge>
					<LangBadge lang={playlist.lang} />
				</div>
			</div>
			<div className="flex items-start justify-between gap-4">
				<h2 className="h2 my-0">{playlist.title}</h2>
			</div>
			{playlist.description && (
				<p className="text-muted-foreground text-sm">{playlist.description}</p>
			)}

			{/* Cover image (shown when URL is not embeddable) */}
			{playlist.cover_image_path && !isEmbeddableUrl(playlist.href) && (
				<img
					src={playlistCoverUrlify(playlist.cover_image_path)}
					alt={`Cover for ${playlist.title}`}
					className="h-48 w-full rounded-lg object-cover"
				/>
			)}

			{/* Embed player for source material — always sticky */}
			{playlist.href && (
				<div className="sticky top-0 z-10">
					<PlaylistEmbed href={playlist.href} />
				</div>
			)}

			{/* Track list of linked phrases */}
			{!compact && (
				<div className="text-muted-foreground flex flex-col gap-1 text-sm">
					{data?.map(({ phrase }, index) => (
						<Link
							key={phrase.id}
							to="/learn/$lang/phrases/$id"
							params={{ lang: phrase.lang, id: phrase.id }}
							className="hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1 transition-colors"
						>
							<span className="text-muted-foreground/50 w-6 text-end text-xs">
								{index + 1}
							</span>
							<span
								className="truncate font-medium"
								style={
									{
										viewTransitionName: `phrase-text-${phrase.id}`,
									} as CSSProperties
								}
							>
								&ldquo;
								{phrase.text.length > 60 ?
									`${phrase.text.slice(0, 60)}...`
								:	phrase.text}
								&rdquo;
							</span>
							{phrase.translations && phrase.translations.length > 0 && (
								<span className="text-muted-foreground/70 ms-auto text-xs whitespace-nowrap">
									{phrase.translations.length} translation
									{phrase.translations.length === 1 ? '' : 's'}
								</span>
							)}
							{phrase.card?.status &&
								['active', 'learned'].includes(phrase.card.status) && (
									<Bookmark className="shrink-0 fill-purple-600/50 text-purple-600" size={12} />
								)}
						</Link>
					))}

					{/* Add phrase row — inline with the track list */}
					{isOwner && !showAddPhrase && (
						<button
							type="button"
							onClick={() => setShowAddPhrase(true)}
							className="hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded px-2 py-1 transition-colors"
							data-testid="add-phrase-to-playlist-button"
						>
							<span className="flex w-6 justify-end">
								<Plus className="h-3 w-3" />
							</span>
							<span className="font-medium">Add phrase</span>
						</button>
					)}
				</div>
			)}

			{/* Inline phrase creator — between track list and social buttons */}
			{!compact && isOwner && showAddPhrase && (
				<InlinePhraseCreator
					lang={playlist.lang}
					onPhraseCreated={(phraseId) => {
						linkPhraseMutation.mutate(phraseId)
					}}
					onCancel={() => setShowAddPhrase(false)}
					submitLabel="Add phrase to playlist"
					allowAddAnother
				/>
			)}

			{/* Bulk add all playlist phrases to deck */}
			{!compact && userId && hasDeck && phrasesNotInDeck.length > 0 && (
				<Button
					variant="soft"
					onClick={() =>
						bulkAddMutation.mutate(
							phrasesNotInDeck.map((item) => item.phrase.id)
						)
					}
					disabled={bulkAddMutation.isPending}
					data-testid="bulk-add-playlist-to-deck"
				>
					{bulkAddMutation.isPending ?
						'Adding…'
					:	`Add ${phrasesNotInDeck.length} new card${phrasesNotInDeck.length === 1 ? '' : 's'} to deck`}
				</Button>
			)}

			<div className="text-muted-foreground flex items-center justify-between gap-4 text-sm">
				<div className="flex items-center gap-4">
					<UpvotePlaylist playlist={playlist} />
					{playlist.href ?
						<a
							className="hover:text-foreground flex items-center gap-1 underline"
							href={playlist.href}
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLink className="h-4 w-4" />
							<span>Source link</span>
						</a>
					:	null}
				</div>
				<div className="flex items-center gap-2">
					<SharePlaylistButton id={playlist.id} />
					<SendPlaylistToFriendDialog id={playlist.id} lang={playlist.lang}>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Send this playlist to a friend"
							data-testid="send-playlist-to-friend-button"
						>
							<Send className="h-4 w-4" />
						</Button>
					</SendPlaylistToFriendDialog>
				</div>
			</div>
		</div>
	)
}
