import { createOptimisticAction } from '@tanstack/db'
import type { MouseEvent } from 'react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { ThumbsUp } from 'lucide-react'

import {
	phrasePlaylistsCollection,
	phrasePlaylistUpvotesCollection,
} from '@/features/playlists/collections'
import { useHasPlaylistUpvote } from '@/features/playlists/hooks'
import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import { Button } from '@/components/ui/button'
import { PhrasePlaylistType } from '@/features/playlists/schemas'
import { useRequireAuth } from '@/hooks/use-require-auth'

type UpvoteInput = {
	playlistId: uuid
	action: 'add' | 'remove'
	currentCount: number
}

const setPlaylistUpvote = createOptimisticAction<UpvoteInput>({
	onMutate: ({ playlistId, action, currentCount }) => {
		const nextCount =
			action === 'add' ? currentCount + 1 : Math.max(0, currentCount - 1)
		phrasePlaylistsCollection.update(playlistId, (draft) => {
			draft.upvote_count = nextCount
		})
		if (action === 'add') {
			phrasePlaylistUpvotesCollection.insert({ playlist_id: playlistId })
		} else {
			phrasePlaylistUpvotesCollection.delete(playlistId)
		}
	},
	mutationFn: async ({ playlistId, action }) => {
		const { error } = await supabase.rpc('set_phrase_playlist_upvote', {
			p_playlist_id: playlistId,
			p_action: action,
		})
		if (error) throw error
		await Promise.all([
			phrasePlaylistsCollection.utils.refetch(),
			phrasePlaylistUpvotesCollection.utils.refetch(),
		])
	},
})

export function UpvotePlaylist({ playlist }: { playlist: PhrasePlaylistType }) {
	const requireAuth = useRequireAuth()
	const hasUpvoted = useHasPlaylistUpvote(playlist.id)

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		requireAuth(() => {
			const action: 'add' | 'remove' = hasUpvoted ? 'remove' : 'add'
			void Promise.all([
				phrasePlaylistsCollection.preload(),
				phrasePlaylistUpvotesCollection.preload(),
			]).then(() => {
				const tx = setPlaylistUpvote({
					playlistId: playlist.id,
					action,
					currentCount: playlist.upvote_count ?? 0,
				})
				tx.isPersisted.promise.then(
					() => toastSuccess(action === 'add' ? 'Vote added!' : 'Vote removed'),
					(err: unknown) => {
						const message = err instanceof Error ? err.message : 'unknown error'
						toastError(`Failed to update upvote: ${message}`)
					}
				)
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
