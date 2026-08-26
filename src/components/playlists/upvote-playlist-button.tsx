import type { MouseEvent } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import { useMyPlaylistUpvote } from '@/features/playlists/hooks'
import { Button } from '@/components/ui/button'
import { PhrasePlaylistType } from '@/features/playlists/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvotePlaylist({ playlist }: { playlist: PhrasePlaylistType }) {
	const requireAuth = useRequireAuth()
	const upvote = useMyPlaylistUpvote(playlist.id)
	const hasUpvoted = upvote?.deleted === false

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			// Un-upvoting flips `deleted` rather than removing the row, so the
			// collection mirrors the table.
			const tx = upvote
				? phrasePlaylistUpvotesCollection.update(playlist.id, (draft) => {
						draft.deleted = !draft.deleted
					})
				: phrasePlaylistUpvotesCollection.insert({
						playlist_id: playlist.id,
						deleted: false,
					})
			tx.isPersisted.promise.then(
				() => toastSuccess(hasUpvoted ? 'Vote removed' : 'Vote added!'),
				(err: unknown) => {
					const message = err instanceof Error ? err.message : 'unknown error'
					toastError(`Failed to update upvote: ${message}`)
				}
			)
		}, 'Please log in to vote on playlists')
	}

	return (
		<div className="text-muted-foreground flex flex-row items-center gap-2 text-sm">
			<Button
				variant={hasUpvoted ? 'soft' : 'ghost'}
				aria-label={hasUpvoted ? 'Remove vote' : 'Vote up this playlist'}
				size="icon"
				data-name="upvote-playlist-button"
				onClick={handleClick}
			>
				<ThumbsUp />
			</Button>
			<span className="font-medium">
				{playlist.upvote_count}{' '}
				<span className="sr-only">
					vote{playlist.upvote_count === 1 ? '' : 's'}
				</span>
			</span>
		</div>
	)
}
