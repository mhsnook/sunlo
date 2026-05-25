import type { MouseEvent } from 'react'
import { ThumbsUp } from 'lucide-react'

import { phrasePlaylistUpvotesCollection } from '@/features/playlists/collections'
import { useHasPlaylistUpvote } from '@/features/playlists/hooks'
import { Button } from '@/components/ui/button'
import { PhrasePlaylistType } from '@/features/playlists/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

export function UpvotePlaylist({ playlist }: { playlist: PhrasePlaylistType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = useHasPlaylistUpvote(playlist.id)

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			void phrasePlaylistUpvotesCollection.preload().then(() => {
				if (hasUpvoted) {
					phrasePlaylistUpvotesCollection.delete(playlist.id)
				} else {
					phrasePlaylistUpvotesCollection.insert({ playlist_id: playlist.id })
				}
			})
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
