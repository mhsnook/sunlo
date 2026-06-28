// Non-route helper components for the language Browse / Discover page
// (`/browse/$lang`). Kept beside the route file (prefixed `-` so the router
// ignores it) to keep the route module itself focused on data + layout.
import { type CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { Check, Plus, Volume2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { usePhrase } from '@/hooks/composite-phrase'
import { useDeckPids } from '@/features/deck/hooks'
import { playlistPhraseLinksCollection } from '@/features/playlists/collections'
import type { PhrasePlaylistType } from '@/features/playlists/schemas'
import type { uuid } from '@/types/main'

import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { CardStatusHeart } from '@/components/card-pieces/card-status-dropdown'
import Flagged from '@/components/flagged'

/** Small "✓ Added / + Add" status pill shown in the corner of set tiles. */
function AddedPill({ added }: { added: boolean }) {
	return (
		<span
			className={cn(
				'flex items-center gap-1 text-xs font-medium',
				added ? 'text-5-hi-success' : 'text-primary-foresoft'
			)}
		>
			{added ? (
				<>
					<Check className="size-3" /> Added
				</>
			) : (
				<>
					<Plus className="size-3" /> Add
				</>
			)}
		</span>
	)
}

/**
 * One "Popular Set" tile. Computes its own phrase-count and whether every
 * phrase in the set is already in the learner's deck (the Added/Add status).
 * The whole tile links through to the playlist detail page.
 */
export function SetTile({
	playlist,
	lang,
}: {
	playlist: PhrasePlaylistType
	lang: string
}) {
	const { data: links } = useLiveQuery(
		(q) =>
			q
				.from({ link: playlistPhraseLinksCollection })
				.where(({ link }) => eq(link.playlist_id, playlist.id)),
		[playlist.id]
	)
	const { data: deckPids } = useDeckPids(lang)

	const phraseIds = links?.map((l) => l.phrase_id) ?? []
	const inDeck = new Set(deckPids?.all ?? [])
	const added =
		phraseIds.length > 0 && phraseIds.every((pid) => inDeck.has(pid))

	return (
		<Link
			to="/learn/$lang/playlists/$playlistId"
			params={{ lang, playlistId: playlist.id }}
			className="bg-card/50 hover:border-primary block rounded border p-4 transition-colors"
			data-testid="browse-set-tile"
			data-key={playlist.id}
		>
			<div className="flex items-start justify-between gap-2">
				<h3 className="font-semibold">{playlist.title}</h3>
				<AddedPill added={added} />
			</div>
			<div className="text-muted-foreground mt-1 flex items-end justify-between gap-2 text-sm">
				<p className="line-clamp-1">
					{playlist.description ?? 'Flashcard set'}
				</p>
				<span className="shrink-0">
					{phraseIds.length} card{phraseIds.length === 1 ? '' : 's'}
				</span>
			</div>
		</Link>
	)
}

/**
 * One "New Card" flashcard tile. Hydrates the phrase by id (so it carries the
 * fully-composed type the bookmark control expects) and renders the native
 * text, the learner's translations, and any extra translations as notes.
 */
export function NewCardTile({ pid }: { pid: uuid }) {
	const { data: phrase, status } = usePhrase(pid)

	if (status === 'pending')
		return (
			<CardlikeFlashcard className="flex h-44 items-center justify-center p-4">
				<Loader />
			</CardlikeFlashcard>
		)
	if (status === 'not-found' || !phrase) return null

	const [primary, ...rest] = phrase.translations_mine?.length
		? phrase.translations_mine
		: phrase.translations

	return (
		<CardlikeFlashcard
			className="flex flex-col p-4"
			style={{ viewTransitionName: `phrase-${phrase.id}` } as CSSProperties}
			data-testid="browse-card-tile"
			data-key={phrase.id}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<p className="text-lg leading-tight font-semibold">{phrase.text}</p>
					<Flagged name="text_to_speech">
						<Button variant="ghost" size="icon" aria-label="Play audio">
							<Volume2 />
						</Button>
					</Flagged>
				</div>
				<CardStatusHeart phrase={phrase} />
			</div>

			{primary ? <p className="mt-3 font-medium">{primary.text}</p> : null}

			{rest.length > 0 ? (
				<div className="text-muted-foreground mt-3 space-y-1 border-t pt-3 text-sm">
					{rest.map((t) => (
						<p key={t.id}>{t.text}</p>
					))}
				</div>
			) : null}

			<div className="mt-auto flex flex-wrap gap-1 pt-3">
				{phrase.tags?.slice(0, 3).map((tag) => (
					<Badge key={tag.id} variant="secondary" size="sm">
						{tag.name}
					</Badge>
				))}
			</div>
		</CardlikeFlashcard>
	)
}
